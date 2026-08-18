                  SEED SOURCES
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       URLs        Discovery     Data provider
          │          sources
          └────────────┼────────────┘
                       ↓
                Candidate Accounts
                       ↓
                 Qualification
                       ↓
              "Is this usable creator?"
                       ↓
                 Creator Queue
                       ↓
                  RabbitMQ
                       ↓
                Python Worker
                       ↓
              Permitted Collector
                       ↓
               Raw Creator Data
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
       Metric Processor       NLP/ML
              ↓                 ↓
       Followers             Niche
       Avg Views             Category
       Engagement             Topics
       Growth
              └────────┬────────┘
                       ↓
                PostgreSQL
                       ↓
              Search / Filtering
                       ↓
                   Agency