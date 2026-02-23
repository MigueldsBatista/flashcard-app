"""
Vision Engine Module
Handles OCR text extraction using LangChain Vision and image processing/compression.
"""

import io
import base64
from PIL import Image
from typing import TypedDict

from langchain_core.messages import HumanMessage

try:
    from api.modules.ai import get_llm
    from api.modules.exceptions import ExtractionFailedException
except ImportError:
    from modules.ai import get_llm
    from modules.exceptions import ExtractionFailedException

class ImageInfoDict(TypedDict):
    width: int
    height: int
    format: str
    mode: str


def extract_text(image_bytes: bytes) -> str:
    """
    Extract text from image using LangChain Vision (provider set by LLM_PROVIDER).
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

        # Build multimodal LangChain message
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Extraia todo o texto visível desta imagem. "
                        "Retorne APENAS o texto extraído, sem formatação adicional, "
                        "comentários ou explicações. Se houver múltiplas colunas ou "
                        "seções, mantenha a ordem de leitura natural."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                    },
                },
            ]
        )

        llm = get_llm()
        response = llm.invoke([message])

        extracted_text = (
            response.content.strip()
            if hasattr(response, "content") and response.content
            else ""
        )

        if not extracted_text:
            raise ExtractionFailedException(
                "Não foi possível extrair texto da imagem",
                suggestion="Tente enviar uma imagem mais nítida",
            )

        return extracted_text

    except ExtractionFailedException:
        raise
    except Exception as e:
        raise ExtractionFailedException(
            f"Falha ao extrair texto da imagem: {str(e)}",
            suggestion="Verifique se o arquivo é uma imagem válida",
        )


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

