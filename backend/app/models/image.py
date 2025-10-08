from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from ..db import Base
import enum

class ImageStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"

class Image(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)          # stored filename
    original_name = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    storage_url = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    crs = Column(String, nullable=True)
    meta = Column(JSON, nullable=True)
    status = Column(Enum(ImageStatus), default=ImageStatus.pending)
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    bbox = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=True)
