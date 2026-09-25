import os
import uuid
import re
from pathlib import Path
from fastapi import UploadFile, HTTPException
from config import settings

# Maximum allowed file size (25 MB)
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}

class FileHandler:
    @staticmethod
    def generate_document_id() -> str:
        """Generate a short unique document identifier."""
        return uuid.uuid4().hex[:12]

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename to prevent directory traversal or unsafe characters.
        """
        clean_name = os.path.basename(filename)
        clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
        return clean_name

    @staticmethod
    def validate_document_file(file: UploadFile, content: bytes) -> None:
        """
        Validate file extension and size for PDF, PowerPoint (.pptx), and Image documents.
        """
        filename_lower = file.filename.lower()
        valid_extensions = (".pdf", ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")
        
        if not any(filename_lower.endswith(ext) for ext in valid_extensions):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF (.pdf), PowerPoint (.pptx), or Image (.png, .jpg, .jpeg, .webp) document."
            )

        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        if len(content) > MAX_FILE_SIZE_BYTES:
            max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed limit of {max_mb:.0f}MB."
            )

    @classmethod
    def save_upload_file(cls, file: UploadFile, content: bytes) -> tuple[str, str, Path]:
        """
        Validate and save uploaded document bytes to local uploads directory.
        Returns: (document_id, sanitized_filename, file_path)
        """
        cls.validate_document_file(file, content)
        
        doc_id = cls.generate_document_id()
        safe_name = cls.sanitize_filename(file.filename)
        saved_filename = f"{doc_id}_{safe_name}"
        saved_path = settings.UPLOAD_DIR / saved_filename

        with open(saved_path, "wb") as f:
            f.write(content)

        return doc_id, safe_name, saved_path
