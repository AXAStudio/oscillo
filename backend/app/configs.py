"""
API Configs
"""

import os


class DBSchema:
    """
    Database Schema
    """
    def __init__(self):
        self.USERS = "users"
        self.PORTFOLIOS = "portfolios"
        self.ORDERS = "orders"


class Config:
    """
    Uniform Configs
    """
    def __init__(self):
        self.SUPABASE_URL = os.getenv("SUPABASE_URL")
        self.SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
        self.DB_SCHEMA = DBSchema()


class DevConfig(Config):
    """
    Development Configs
    """
    DEBUG = True
    def __init__(self):
        from dotenv import load_dotenv
        load_dotenv()

        super().__init__()


class ProdConfig(Config):
    """
    Production Configs
    """
    DEBUG = False


# Setup API Config
if os.getenv("ENV") == "PROD":
    config = ProdConfig()
else:
    config = DevConfig()
