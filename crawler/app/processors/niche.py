from __future__ import annotations

from dataclasses import dataclass

TAXONOMY: dict[str, dict[str, list[str]]] = {
    "Fashion": {
        "Men's Fashion": ["menswear", "men's fashion", "mens fashion", "tailoring"],
        "Women's Fashion": ["womenswear", "women's fashion", "saree", "kurta"],
        "Streetwear": ["streetwear", "sneakers", "hype", "oversized"],
        "Luxury": ["luxury", "couture", "designer"],
        "_general": ["fashion", "ootd", "outfit", "style", "wardrobe", "lookbook", "indianfashion", "instafashion", "fashionblogger"],
    },
    "Fitness": {
        "Gym": ["gym", "hypertrophy", "bodybuilding", "strength"],
        "Running": ["running", "marathon", "5k", "10k"],
        "Yoga": ["yoga", "pilates", "vinyasa"],
        "Athletics": ["athletics", "athlete", "sport"],
        "_general": ["fitness", "workout", "training", "fitfam", "gymlife", "fitnessmotivation"],
    },
    "Technology": {
        "AI": ["artificial intelligence", "machine learning", "chatgpt", " llm", "ai ", "artificialintelligence"],
        "Programming": ["programming", "developer", "coding", "javascript", "python"],
        "Gadgets": ["gadget", "smartphone", "unboxing", "tech review", "techreview"],
        "_general": ["technology", "tech", "software", "startup"],
    },
    "Beauty": {
        "Skincare": ["skincare", "serum", "moisturizer", "skincareroutine"],
        "Makeup": ["makeup", "lipstick", "foundation", "mua", "makeuplook"],
        "Hair": ["haircare", "hair"],
        "_general": ["beauty", "glow"],
    },
    "Food": {
        "Home Cooking": ["recipe", "home cooking", "kitchen"],
        "Street Food": ["street food", "hawker"],
        "Cafes": ["cafe", "coffee", "bakery"],
        "_general": ["food", "foodie", "cooking", "foodstagram", "instafood", "foodblogger"],
    },
    "Travel": {
        "City Guides": ["city guide", "neighborhood"],
        "Adventure": ["trek", "hike", "adventure"],
        "Budget Travel": ["budget travel", "hostel"],
        "_general": ["travel", "itinerary", "wander", "travelgram", "wanderlust", "travelblogger", "vacation"],
    },
    "Lifestyle": {
        "Home": ["interior", "home decor", "homedecor"],
        "Productivity": ["productivity", "routine"],
        "Wellness": ["wellness", "mindfulness"],
        "_general": ["lifestyle", "vlog", "daily life", "dailylife"],
    },
    "Finance": {
        "Investing": ["investing", "stocks", "mutual fund", "sip", "stockmarket"],
        "_general": ["finance", "money", "personal finance", "personalfinance"],
    },
    "Comedy": {
        "Sketch": ["sketch", "skit"],
        "_general": ["comedy", "funny", "humor", "stand up", "standup", "comedian"],
    },
    "Automotive": {
        "Cars": ["supercar", "car review", "carreview"],
        "_general": ["automotive", "cars", "motorsport", "carsofinstagram"],
    },
    "Education": {
        "Career": ["career", "linkedin", "job"],
        "_general": ["education", "learning", "motivation", "self help", "selfhelp", "studygram"],
    },
    "Photography": {
        "Portrait": ["portrait", "photoshoot"],
        "_general": ["photography", "photographer", "visual arts", "photooftheday"],
    },
}


@dataclass
class NicheHit:
    niche: str
    sub_niche: str | None


class NicheClassifier:
    """Deterministic multi-label keyword classifier. No LLM."""

    def classify_many(self, texts: list[str | None]) -> list[NicheHit]:
        blob = " ".join(t for t in texts if t).lower()
        if not blob.strip():
            return []
        hits: list[NicheHit] = []
        for niche, subs in TAXONOMY.items():
            general_hits = sum(blob.count(k) for k in subs.get("_general", []))
            sub_best: tuple[int, str] | None = None
            for sub, keys in subs.items():
                if sub == "_general":
                    continue
                count = sum(blob.count(k) for k in keys)
                if count and (sub_best is None or count > sub_best[0]):
                    sub_best = (count, sub)
            total = general_hits + (sub_best[0] if sub_best else 0)
            if total == 0:
                continue
            hits.append(NicheHit(niche, sub_best[1] if sub_best else None))
        return hits
