from database.models import Era
from sqlalchemy.dialects.postgresql import insert

ERAS_SEED = [
    {
        "year": 1995,
        "title": "Web 1.0 Dawn",
        "subtitle": "Commercial web boom & basic CGI scripts",
        "stats": {
            "roles": [
                ["Webmaster", "HIGH", "Manages the entire website, from server setup to HTML coding."],
                ["Sysadmin", "$50k/YR", "Maintains servers, networks, and IT infrastructure."],
                ["C++ Dev", "CORE", "Builds high-performance backend systems and desktop software."],
                ["DBA (Oracle)", "ENTERPRISE", "Specialist in managing complex enterprise databases."],
                ["Network Engineer", "GROWING", "Designs and maintains network topologies for growing companies."],
                ["QA Tester", "NEW ROLE", "Manually tests software for bugs before release."]
            ],
            "stack": [
                ["HTML/CGI", "NEW", "Basic markup and Common Gateway Interface scripts for dynamic web pages."],
                ["Perl", "BACKEND", "The 'duct tape of the internet', used for CGI scripting and text processing."],
                ["C/C++", "SYSTEM", "Used for performance-critical components and web servers."],
                ["Oracle DB", "DATA", "Dominant enterprise relational database system."],
                ["Delphi", "DESKTOP", "Rapid application development tool for Windows software."],
                ["FTP/Telnet", "OPS", "Standard protocols for file transfer and remote server management."]
            ],
            "hypeTopic": "Dot-Com Boom",
            "hypeDesc": "Creation of the first commercial websites. The internet becomes accessible to the masses. Everyone wants their own website."
        }
    },
    {
        "year": 2008,
        "title": "Mobile & Cloud Era",
        "subtitle": "App Store launch & AWS Cloud standardization",
        "stats": {
            "roles": [
                ["iOS/Android Dev", "HOT", "Builds native applications for the booming smartphone market."],
                ["Fullstack", "$90k/YR", "Handles both frontend interfaces and backend APIs."],
                ["Scrum Master", "TREND", "Facilitates Agile development processes within teams."],
                ["Cloud Architect", "EMERGING", "Designs scalable infrastructure on public clouds like AWS."],
                ["UX Designer", "GROWING", "Focuses on user experience and interface usability."],
                ["QA Automation", "STANDARD", "Writes scripts to automatically test software functionality."]
            ],
            "stack": [
                ["Objective-C", "MOBILE", "Primary language for developing iOS applications."],
                ["Java", "ENTERPRISE", "Standard language for large-scale enterprise backends and Android."],
                ["Ruby on Rails", "STARTUPS", "Popular framework for rapid web application development."],
                ["jQuery", "FRONTEND", "Simplifies JavaScript HTML DOM traversal and manipulation."],
                ["MySQL/Postgres", "DATA", "Leading open-source relational database management systems."],
                ["AWS EC2/S3", "INFRA", "Foundational cloud computing and storage services."]
            ],
            "hypeTopic": "App Economy",
            "hypeDesc": "Mobile applications change the market. The launch of AWS makes cloud infrastructure the standard."
        }
    },
    {
        "year": 2018,
        "title": "Cloud Native & Crypto",
        "subtitle": "Kubernetes orchestration & Microservices",
        "stats": {
            "roles": [
                ["DevOps/SRE", "CRITICAL", "Bridges development and operations, ensuring system reliability."],
                ["Data Scientist", "SEXY", "Analyzes large datasets to extract insights and build predictive models."],
                ["Web3 Dev", "NICHE", "Develops decentralized applications and smart contracts on blockchains."],
                ["ML Engineer", "$140k/YR", "Deploys machine learning models into production environments."],
                ["Platform Eng.", "RISING", "Builds internal developer platforms to improve engineering efficiency."],
                ["Product Manager", "HOT", "Guides the strategy, development, and launch of products."]
            ],
            "stack": [
                ["Go/Docker", "INFRA", "Go for microservices, Docker for containerizing applications."],
                ["Python", "DATA", "Dominant language for data science, AI, and scripting."],
                ["React/Vue", "FRONTEND", "Leading component-based JavaScript frameworks for building UIs."],
                ["Kubernetes", "ORCHESTRATION", "Industry standard for automating deployment and scaling of containers."],
                ["TensorFlow", "ML", "Open-source library for machine learning and artificial intelligence."],
                ["GraphQL", "API", "Query language for APIs, allowing clients to request exactly what they need."]
            ],
            "hypeTopic": "Blockchain & Microservices",
            "hypeDesc": "Decentralization, smart contracts, and the enterprise transition to microservice architecture."
        }
    },
    {
        "year": 2026,
        "title": "AI Agents Era",
        "subtitle": "Autonomous LLMs, System Logic & Agentic Workflows",
        "stats": {
            "roles": [
                ["Backend (Go/C#)", "HIGH DEMAND", "Engineers building robust, scalable APIs and microservices."],
                ["AI Integrator", "$130k/YR", "Specializes in embedding LLMs and AI capabilities into existing products."],
                ["DevOps Arch.", "CORE", "Designs high-level cloud architecture and deployment pipelines."],
                ["Prompt Engineer", "EMERGING", "Crafts and optimizes prompts to extract the best responses from LLMs."],
                ["MLOps Engineer", "CRITICAL", "Manages the lifecycle, scaling, and monitoring of ML models in production."],
                ["Security Eng.", "RISING", "Protects systems against increasingly sophisticated, AI-driven cyber threats."]
            ],
            "stack": [
                ["Python", "AI CORE", "The lingua franca of AI, machine learning, and data engineering."],
                ["Go", "MICROSERVICES", "Preferred for building fast, concurrent, and scalable backend services."],
                ["TypeScript", "WEB STD", "Strict syntactical superset of JavaScript, standard for web development."],
                ["Rust", "SYSTEMS", "Memory-safe systems programming language for high-performance components."],
                ["LangChain", "AGENTS", "Framework for developing applications powered by language models."],
                ["Terraform", "IaC", "Infrastructure as Code tool for building, changing, and versioning infrastructure safely."]
            ],
            "hypeTopic": "AI Agents: System Logic",
            "hypeDesc": "Autonomous architecture design. The transition from simple code string generation to systemic refactoring."
        }
    }
]

def seed_eras(session):
    """Seeds the eras table with historical IT era definitions."""
    print("🕐 Seeding historical IT eras...")
    try:
        for era_data in ERAS_SEED:
            stmt = insert(Era).values(**era_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["year"])
            session.execute(stmt)
        session.commit()
        print(f"✅ Seeded {len(ERAS_SEED)} eras (duplicates ignored).")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding eras: {e}")
