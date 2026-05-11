import re
import html
import joblib
import numpy as np
import sys
import time
import os
from typing import List, Dict, Any
from transformers import pipeline
import torch

from config import settings

# MLflow is optional — only imported if MLFLOW_TRACKING_URI is configured
try:
    import mlflow
    import mlflow.sklearn
    import mlflow.transformers
    MLFLOW_AVAILABLE = True
except Exception:
    MLFLOW_AVAILABLE = False
    mlflow = None

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ══════════════════════════════════════════════════════════════════════
# 1. PREPROCESSING
# ══════════════════════════════════════════════════════════════════════

def preprocess_toxicity(text: str) -> str:
    if not isinstance(text, str): return ""
    text = html.unescape(text)
    text = re.sub(r"^RT\s+@\w+\s*:?", "", text, flags=re.I)
    text = re.sub(r"\bRT\b", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"<[a-zA-Z/][^>]*>", "", text)
    text = re.sub(r"([!?.]){2,}", r"\1", text)
    text = re.sub(r"^\d[\d\s\-]+\n", "", text)
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text

def preprocess_sentiment(text: str) -> str:
    if not isinstance(text, str): return ""
    text = text.lower()
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'#', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ══════════════════════════════════════════════════════════════════════
# 2. SIGNAL COMBINATION DESIGN
# ══════════════════════════════════════════════════════════════════════

class RiskScoringEngine:
    def __init__(self, 
                 toxicity_model_path: str = settings.TOX_MODEL_PATH, 
                 sentiment_model_path: str = settings.SENT_MODEL_PATH, 
                 sentiment_vec_path: str = settings.SENT_VEC_PATH, 
                 mode: str = settings.MODEL_MODE):
        self.mode = mode.upper()
        print(f"Initializing Risk Engine in {self.mode} mode")
        
        # 1. Toxicity Model Loading
        # The XGBoost toxicity model is ALWAYS loaded regardless of mode —
        # it is the primary hate-speech / offensive-language detector.
        # TRANSFORMERS mode only changes the *sentiment* model, not toxicity.
        print(f"Loading Toxicity Model: {toxicity_model_path}")
        try:
            self.tox_pipe = joblib.load(toxicity_model_path)
            # Patch for scikit-learn version mismatch
            try:
                from sklearn.linear_model import LogisticRegression
                if hasattr(self.tox_pipe, 'steps'):
                    for name, step in self.tox_pipe.steps:
                        if isinstance(step, LogisticRegression) and not hasattr(step, 'multi_class'):
                            step.multi_class = 'ovr'
                elif isinstance(self.tox_pipe, LogisticRegression) and not hasattr(self.tox_pipe, 'multi_class'):
                    self.tox_pipe.multi_class = 'ovr'
            except Exception as e:
                print(f"Note: Could not patch toxicity model: {e}")
            print("Toxicity model loaded OK.")
        except Exception as e:
            print(f"Warning: Failed to load toxicity model {toxicity_model_path}: {e}")
            self.tox_pipe = None

        # 2. Sentiment Model Loading
        if self.mode == "TRANSFORMERS":
            # Check MLflow Registry first if configured
            if settings.MLFLOW_TRACKING_URI and MLFLOW_AVAILABLE:
                try:
                    print(f"Attempting to load Transformer model from MLflow Registry (alias: {settings.MLFLOW_MODEL_ALIAS})...")
                    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
                    model_uri = f"models:/SentimentModel/{settings.MLFLOW_MODEL_ALIAS}"
                    self.sent_pipe = mlflow.transformers.load_model(model_uri)
                    print("Successfully loaded model from MLflow.")
                except Exception as e:
                    print(f"MLflow load failed: {e}. Falling back to local/HF.")
                    self._load_local_transformer()
            else:
                self._load_local_transformer()
        else:
            print(f"Loading Traditional Sentiment Model: {sentiment_model_path}")
            try:
                # Check MLflow for traditional model if registry is available
                if settings.MLFLOW_TRACKING_URI and MLFLOW_AVAILABLE:
                     mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
                     model_uri = f"models:/TraditionalSentiment/{settings.MLFLOW_MODEL_ALIAS}"
                     self.sent_model = mlflow.sklearn.load_model(model_uri)
                     # Vectorizer still needs local load or separate artifact handling
                     self.sent_vec = joblib.load(sentiment_vec_path)
                else:
                    self.sent_model = joblib.load(sentiment_model_path)
                    self.sent_vec = joblib.load(sentiment_vec_path)
                self.sent_pipe = "TRADITIONAL"
            except Exception as e:
                print(f"Warning: Failed to load traditional sentiment: {e}")
                self.sent_pipe = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english", device=-1)
        
        self.tox_classes = ["Hate Speech", "Offensive", "Neither"]

    def _load_local_transformer(self):
        local_model_path = settings.TRANSFORMER_MODEL_PATH
        if os.path.exists(local_model_path):
            print(f"Loading LOCAL custom Transformer Sentiment Model from {local_model_path}...")
            self.sent_pipe = pipeline("sentiment-analysis", model=local_model_path, tokenizer=local_model_path, device=-1)
        else:
            print("Local transformer model not found. Using pre-trained DistilBERT...")
            model_name = "distilbert-base-uncased-finetuned-sst-2-english"
            self.sent_pipe = pipeline("sentiment-analysis", model=model_name, device=-1)

    # Danger keywords for fallback when toxicity model is unavailable
    DANGER_KEYWORDS = [
        "street race", "street racing", "drag race", "illegal race",
        "accident", "crash", "hit and run", "road rage",
        "kill", "murder", "shoot", "stab", "attack", "threat",
        "bomb", "weapon", "gun", "knife",
        "drunk driving", "drink and drive", "dui",
        "hate", "racist", "slur",
    ]

    def _get_toxicity_signal(self, text: str) -> tuple:
        """Returns (risk_score, confidence, class_id)."""
        if not text:
            return 0.0, 1.0, 2

        clean = preprocess_toxicity(text)

        # ── Keyword fallback when model is unavailable ─────────────────
        if self.tox_pipe is None:
            text_lower = text.lower()
            for kw in self.DANGER_KEYWORDS:
                if kw in text_lower:
                    return 0.75, 0.80, 1  # Offensive class, high confidence
            return 0.0, 1.0, 2

        if len(clean.split()) < 3:
            return 0.0, 1.0, 2
            
        try:
            proba = self.tox_pipe.predict_proba([clean])[0]
            pred  = int(np.argmax(proba))
            conf  = float(proba[pred])
            # 0: Hate Speech, 1: Offensive, 2: Neither
            # We use 0.95 and 0.75 as base risks that will be scaled by confidence
            return {0: 0.95, 1: 0.75, 2: 0.05}[pred], conf, pred
        except Exception as e:
            print(f"Error predicting toxicity: {e}")
            return 0.0, 1.0, 2

    def _get_sentiment_signals_batch(self, texts: List[str]) -> List[tuple]:
        """Returns List of (risk_score, confidence, class_id). 0=Negative, 1=Positive."""
        if not texts:
            return []
            
        cleaned_texts = [preprocess_sentiment(t) for t in texts]
        valid_indices = [i for i, t in enumerate(cleaned_texts) if t]
        valid_texts = [cleaned_texts[i] for i in valid_indices]
        
        results = [None] * len(texts)
        for i in range(len(texts)):
            if i not in valid_indices:
                results[i] = (0.0, 1.0, 1)
        
        if valid_texts:
            from firebase_service import check_for_override
            try:
                if self.sent_pipe == "TRADITIONAL":
                    vecs = self.sent_vec.transform(valid_texts)
                    preds = self.sent_model.predict(vecs)
                    probs = self.sent_model.predict_proba(vecs)
                    for i, (idx, pred) in enumerate(zip(valid_indices, preds)):
                        # CHECK FOR HUMAN OVERRIDE FIRST
                        override = check_for_override(valid_texts[i])
                        if override is not None:
                            # Map override class to sentiment risk
                            # 0=Hate/Neg, 1=Offensive/Neg, 2=Neither/Pos
                            risk = 1.0 if override < 2 else 0.0
                            results[idx] = (risk, 1.0, int(override < 2))
                        else:
                            risk = 1.0 if pred == 0 else 0.0
                            results[idx] = (risk, float(probs[i][pred]), int(pred))
                else:
                    batch_results = self.sent_pipe(valid_texts, batch_size=len(valid_texts))
                    for i, (idx, res) in enumerate(zip(valid_indices, batch_results)):
                        # CHECK FOR HUMAN OVERRIDE FIRST
                        override = check_for_override(valid_texts[i])
                        if override is not None:
                            risk = 1.0 if override < 2 else 0.0
                            results[idx] = (risk, 1.0, int(override < 2))
                        else:
                            label = res['label']
                            score = res['score']
                            if label == 'LABEL_0' or 'NEGATIVE' in label.upper():
                                results[idx] = (1.0, float(score), 0)
                            else:
                                results[idx] = (0.0, float(score), 1)
            except Exception as e:
                print(f"Error in batch sentiment: {e}")
                for idx in valid_indices:
                    results[idx] = (0.0, 1.0, 1)
                    
        return results

    def _combine_signals(self, tox_signal: tuple, sent_signal: tuple) -> Dict[str, Any]:
        """Combines tox and sent signals into a single post-level risk dict."""
        tox_risk, tox_conf, tox_class = tox_signal
        sent_risk, sent_conf, sent_class = sent_signal
        
        context_discounted = False
        neither_suppressed = False
        adjusted_tox_risk = tox_risk

        if tox_class == 0:
            # Hate speech — tox dominates completely
            w_tox_raw  = 1.0
            w_sent_raw = 0.0
            if tox_conf < 0.80:
                adjusted_tox_risk = 0.80
        elif tox_class == 1 and sent_class == 1 and sent_conf >= 0.60:
            # Offensive but positive sentiment → context discount (casual banter)
            discount = min(0.45, (sent_conf - 0.60) * 1.125)
            adjusted_tox_risk = max(0.15, tox_risk - discount)
            w_tox_raw  = 0.60
            w_sent_raw = 0.40
            context_discounted = True
        elif tox_class == 1:
            # Offensive with negative/neutral sentiment → both signals matter
            w_tox_raw  = tox_conf
            w_sent_raw = sent_conf
        else:
            # tox_class == 2 (Neither) — model sees no hate/offensive language.
            # BUT: dangerous behaviour (reckless driving, threats) often uses
            # enthusiastic/positive language. Give sentiment a real voice here.
            # If sentiment is NEGATIVE, treat it as a moderate risk signal.
            w_tox_raw  = tox_conf * 0.3
            w_sent_raw = sent_conf * 0.7   # sentiment gets majority weight
            neither_suppressed = True
            # If sentiment is negative, bump the tox risk floor up
            if sent_class == 0 and sent_conf > 0.60:
                adjusted_tox_risk = max(tox_risk, 0.35)

        # Confidence-weighted combination
        w_tox_final  = tox_conf  * (1.5 if tox_class < 2 else 1.0)
        w_sent_final = sent_conf * (1.2 if tox_class == 2 else 1.0)  # boost sent when tox is neutral

        total_w = w_tox_final + w_sent_final
        wt = w_tox_final  / total_w
        ws = w_sent_final / total_w

        raw_combined = (wt * adjusted_tox_risk) + (ws * sent_risk)
        # Power scaling: ^0.85 makes moderate risks more visible
        final_risk = float(np.power(max(raw_combined, 0.0), 0.85))

        combined_conf = float((wt * tox_conf) + (ws * sent_conf))

        return {
            "risk":               final_risk,
            "conf":               combined_conf,
            "tox_class":          tox_class,
            "tox_risk":           tox_risk,
            "tox_conf":           tox_conf,
            "sent_class":         sent_class,
            "sent_risk":          sent_risk,
            "sent_conf":          sent_conf,
            "context_discounted": context_discounted,
            "neither_suppressed": neither_suppressed,
        }

    def analyze_user_profile(self, posts: List[str], bio: str = "") -> Dict[str, Any]:
        """Profile-level risk aggregation with tiered max weighting."""
        t0 = time.time()
        
        all_texts = ([bio] if bio else []) + posts
        sent_signals = self._get_sentiment_signals_batch(all_texts)
        
        bio_sent = sent_signals[0] if bio else None
        posts_sent = sent_signals[1:] if bio else sent_signals
        
        bio_tox = self._get_toxicity_signal(bio) if bio else None
        posts_tox = [self._get_toxicity_signal(t) for t in posts]
        
        bio_result = self._combine_signals(bio_tox, bio_sent) if bio else None
        post_results = [self._combine_signals(t, s) for t, s in zip(posts_tox, posts_sent)]

        all_results = post_results + ([bio_result] if bio_result else [])
        
        if not all_results:
            return {
                "final_risk_score": 0.0,
                "final_confidence": 1.0,
                "engine_latency": round(time.time() - t0, 4),
                "decision": "APPROVE CAR RENTAL",
                "status_color": "GREEN",
                "metrics": {"max_post_risk": 0.0, "mean_post_risk": 0.0, "total_posts_analyzed": 0},
                "reasons": ["No public posts or bio found. Profile appears safe."],
            }

        risks = [r["risk"] for r in all_results]
        confs = [r["conf"] for r in all_results]

        max_risk  = max(risks)
        mean_risk = sum(risks) / len(risks)

        # ── Danger keyword boost ───────────────────────────────────────
        # Catches reckless/dangerous behaviour that NLP models miss because
        # the language is enthusiastic rather than hateful.
        all_post_text = " ".join(posts + ([bio] if bio else [])).lower()
        keyword_danger_score = 0.0
        matched_danger_keywords = []
        for kw in self.DANGER_KEYWORDS:
            if kw in all_post_text:
                keyword_danger_score = max(keyword_danger_score, 0.55)
                matched_danger_keywords.append(kw)
        # Escalate if multiple danger keywords found
        if len(matched_danger_keywords) >= 2:
            keyword_danger_score = max(keyword_danger_score, 0.72)

        # Merge keyword score into max_risk
        max_risk = max(max_risk, keyword_danger_score)

        # BALANCED AGGREGATION: Pulls up for red flags but doesn't ignore history
        if max_risk >= 0.75:
            final_risk = 0.60 * max_risk + 0.40 * mean_risk
        else:
            final_risk = 0.40 * max_risk + 0.60 * mean_risk

        avg_conf = sum(confs) / len(confs)
        if final_risk < 0.34: 
            decision, color = "APPROVE CAR RENTAL", "GREEN"
        elif final_risk < 0.67: 
            decision, color = "MANUAL REVIEW", "YELLOW"
        else: 
            decision, color = "REJECT CUSTOMER", "RED"

        reasons = []
        if bio_result:
            if bio_result["tox_class"] == 0 and bio_result["tox_conf"] > 0.80:
                reasons.append("High risk content in bio")
            elif bio_result["tox_class"] == 1 and not bio_result["context_discounted"]:
                reasons.append("Offensive patterns in bio")
            elif bio_result["sent_class"] == 0 and bio_result["sent_conf"] > 0.85 and not bio_result["neither_suppressed"]:
                reasons.append("Hostile markers in bio")

        has_hs = any(r["tox_class"] == 0 and r["tox_conf"] > 0.80 for r in post_results)
        has_unfiltered_offensive = any(r["tox_class"] == 1 and not r["context_discounted"] for r in post_results)
        hostile_neg_count = sum(1 for r in post_results if r["sent_class"] == 0 and r["sent_conf"] > 0.80 and not r["neither_suppressed"])
        hostile_neg_ratio = hostile_neg_count / max(1, len(post_results))

        if has_hs:
            reasons.append("Hate speech detected")
        if has_unfiltered_offensive:
            reasons.append("Offensive language detected")
        if hostile_neg_ratio > 0.60:
            reasons.append("Persistent hostile pattern")
        if matched_danger_keywords:
            unique_kws = list(dict.fromkeys(matched_danger_keywords))[:3]
            reasons.append(f"Dangerous behaviour references: {', '.join(unique_kws)}")
        if not reasons:
            reasons.append("Low-risk behavior")

        return {
            "final_risk_score": round(final_risk, 4),
            "final_confidence": round(avg_conf, 4),
            "engine_latency": round(time.time() - t0, 4),
            "decision": decision,
            "status_color": color,
            "metrics": {"max_post_risk": round(max_risk, 4), "mean_post_risk": round(mean_risk, 4), "total_posts_analyzed": len(posts)},
            "reasons": reasons,
        }
