"""
Vision Engine Module
Handles OCR text extraction using Gemini Vision API and image processing/compression.
"""

import io
import os
import base64
from PIL import Image
from google import genai
from typing import TypedDict

def _get_genai_client():
    """Build a raw google.genai client for OCR. Uses GEMINI_API_KEY directly."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY não configurada")
    return genai.Client(api_key=api_key)

class ImageInfoDict(TypedDict):
    width: int
    height: int
    format: str
    mode: str


def extract_text(image_bytes: bytes) -> str:
    """
    Extract text from image using Gemini Vision API.
    """
    try:
        # Convert image to base64
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (handles PNGs with transparency)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if image is too large (max 1024px on longest side)
        max_size = 1024
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to JPEG bytes and base64
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        base64_image = base64.b64encode(buffer.read()).decode('utf-8')
        
        # Use Gemini Vision to extract text
        client = _get_genai_client()
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                {
                    "parts": [
                        {"text": "Extraia todo o texto visível desta imagem. Retorne APENAS o texto extraído, sem formatação adicional, comentários ou explicações. Se houver múltiplas colunas ou seções, mantenha a ordem de leitura natural."},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }
            ],
            config={
                'temperature': 0.1,
                'max_output_tokens': 4096
            }
        )
        
        extracted_text = response.text.strip() if response.text else ""
        
        if not extracted_text:
            raise ValueError("Não foi possível extrair texto da imagem")
            
        return extracted_text
        
    except Exception as e:
        raise ValueError(f"Falha ao extrair texto da imagem: {str(e)}")


def compress_image(image_bytes: bytes, max_size: int = 1024, quality: int = 85) -> bytes:
    """
    Compress image for efficient processing.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB for JPEG
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if needed
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Save as JPEG
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        return output.read()
    except Exception as e:
        raise ValueError(f"Failed to compress image: {str(e)}")


def get_image_info(image_bytes: bytes) -> ImageInfoDict:
    """
    Get basic information about an image.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        return {
            "width": image.width,
            "height": image.height,
            "format": image.format,
            "mode": image.mode
        }
    except Exception as e:
        raise ValueError(f"Failed to get image info: {str(e)}")

