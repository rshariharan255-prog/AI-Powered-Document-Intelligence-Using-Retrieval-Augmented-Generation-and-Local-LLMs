import logging
import re
from pathlib import Path
from typing import List
from fastapi import HTTPException
from models.schemas import PageContent, PDFExtractionResult

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

logger = logging.getLogger(__name__)

class DocumentParserService:
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Perform gentle text cleaning:
        - Normalize multiple horizontal whitespace into a single space
        - Normalize multiple linebreaks
        - Preserve lists, bullet points, numbers, and technical terms
        """
        if not text:
            return ""
        
        # Replace non-breaking spaces and tabs with standard space
        text = text.replace('\xa0', ' ').replace('\t', ' ')
        
        # Remove null and non-printable control characters (except newline \n)
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # Normalize 3+ consecutive newlines down to 2 newlines (preserve paragraphs)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Clean multiple spaces on each line
        lines = [re.sub(r' {2,}', ' ', line).strip() for line in text.splitlines()]
        
        # Rejoin lines
        cleaned = '\n'.join(lines).strip()
        return cleaned

    def _extract_pdf(self, file_path: Path) -> List[PageContent]:
        """Extract text page-by-page from PDF."""
        try:
            doc = pymupdf.open(str(file_path))
        except Exception as e:
            logger.error(f"Failed to open PDF file {file_path}: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Unable to parse the PDF document. The file may be encrypted or corrupted."
            )

        pages: List[PageContent] = []
        try:
            for page_index in range(len(doc)):
                page = doc[page_index]
                raw_text = page.get_text("text") or ""
                cleaned_text = self.clean_text(raw_text)
                
                page_number = page_index + 1
                char_count = len(cleaned_text)

                pages.append(
                    PageContent(
                        page_number=page_number,
                        text=cleaned_text,
                        char_count=char_count
                    )
                )
            return pages
        finally:
            doc.close()

    def _extract_pptx(self, file_path: Path) -> List[PageContent]:
        """Extract text slide-by-slide from PowerPoint (.pptx)."""
        if Presentation is None:
            raise HTTPException(
                status_code=500,
                detail="python-pptx package is not installed on server."
            )

        try:
            prs = Presentation(str(file_path))
        except Exception as e:
            logger.error(f"Failed to open PPTX file {file_path}: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Unable to parse PowerPoint file. The file may be corrupted."
            )

        pages: List[PageContent] = []
        for slide_idx, slide in enumerate(prs.slides):
            slide_texts = []
            
            # Extract text from shapes, text boxes, and tables
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        p_text = "".join(run.text for run in paragraph.runs).strip()
                        if p_text:
                            slide_texts.append(p_text)
                elif shape.has_table:
                    for row in shape.table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            slide_texts.append(row_text)

            # Extract slide notes if any
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    slide_texts.append(f"[Notes: {notes}]")

            raw_text = "\n".join(slide_texts)
            cleaned_text = self.clean_text(raw_text)
            
            slide_number = slide_idx + 1
            pages.append(
                PageContent(
                    page_number=slide_number,
                    text=cleaned_text,
                    char_count=len(cleaned_text)
                )
            )

        return pages

    def extract_text(self, file_path: Path, document_id: str, filename: str) -> PDFExtractionResult:
        """
        Extract text from PDF or PowerPoint documents preserving page/slide numbers.
        """
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server.")

        ext = file_path.suffix.lower()
        if ext in [".pptx", ".ppt"]:
            extracted_pages = self._extract_pptx(file_path)
        else:
            extracted_pages = self._extract_pdf(file_path)

        total_characters = sum(p.char_count for p in extracted_pages)

        # Check if document has readable text
        if total_characters == 0 or all(len(p.text.strip()) == 0 for p in extracted_pages):
            raise HTTPException(
                status_code=400,
                detail="The uploaded document contains no extractable text. Scanned/image-only presentations are not supported."
            )

        logger.info(
            f"Successfully extracted {len(extracted_pages)} slides/pages ({total_characters} characters) "
            f"from document: {filename} [ID: {document_id}]"
        )

        return PDFExtractionResult(
            document_id=document_id,
            filename=filename,
            total_pages=len(extracted_pages),
            total_characters=total_characters,
            pages=extracted_pages,
            message="Document text extracted successfully"
        )

pdf_service = DocumentParserService()
