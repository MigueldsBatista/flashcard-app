"""
Vision Engine Module
Handles OCR text extraction and image processing/compression.
"""

import io
from PIL import Image
import pytesseract


def extract_text(image_bytes: bytes) -> str:
    """
    Extract text from image using Tesseract OCR.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Extracted text from the image
    """
    try:
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
        
        # Use tesseract with Portuguese + English languages
        text = pytesseract.image_to_string(image, lang='por+eng')
        
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from image: {str(e)}")


def compress_image(image_bytes: bytes, max_size: int = 1024, quality: int = 85) -> bytes:
    """
    Compress image for efficient processing.
    
    Args:
        image_bytes: Raw image bytes
        max_size: Maximum dimension (width or height) in pixels
        quality: JPEG quality (1-100)
        
    Returns:
        Compressed image bytes
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


def get_image_info(image_bytes: bytes) -> dict:
    """
    Get basic information about an image.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Dictionary with image info (width, height, format)
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
