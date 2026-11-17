"""
preprocessing.py - Image preprocessing for the MobileNetV2 model.

MobileNetV2 requires:
- Input size: 224x224
- Pixel values scaled to [-1, 1] using tf.keras.applications.mobilenet_v2.preprocess_input
- RGB format (3 channels)

This module ensures all uploaded images are processed the same way
as the training images were processed.
"""

import numpy as np
from PIL import Image
import io


# Standard input size for MobileNetV2
IMAGE_SIZE = (224, 224)


def preprocess_image_bytes(image_bytes):
    """
    Take raw image bytes (from an uploaded file) and return a preprocessed
    numpy array ready for the MobileNetV2 model.

    Steps:
    1. Open the image with Pillow
    2. Convert to RGB (handles grayscale, RGBA, etc.)
    3. Resize to 224x224
    4. Convert to numpy array
    5. Add batch dimension (shape becomes (1, 224, 224, 3))
    6. Apply MobileNetV2 preprocessing (scale to [-1, 1])

    Args:
        image_bytes: Raw bytes of the uploaded image file.

    Returns:
        Preprocessed numpy array of shape (1, 224, 224, 3).

    Raises:
        ValueError: If the image cannot be opened or processed.
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB - MobileNetV2 needs 3 channels
        # This handles grayscale (L), RGBA, palette (P), and other modes
        img = img.convert("RGB")

        # Resize to the required input size
        img = img.resize(IMAGE_SIZE, Image.LANCZOS)

        # Convert PIL Image to numpy array
        img_array = np.array(img, dtype=np.float32)

        # Add batch dimension: (224, 224, 3) -> (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)

        # Apply MobileNetV2's preprocessing:
        # Scales pixel values from [0, 255] to [-1, 1]
        # This is REQUIRED and must match what was used during training
        img_array = (img_array / 127.5) - 1.0

        return img_array

    except Exception as e:
        raise ValueError(f"Could not preprocess image: {str(e)}")


def validate_image(image_bytes, filename):
    """
    Validate an uploaded image before processing.

    Checks:
    - File extension is allowed (jpg, jpeg, png)
    - File size is within limits (max 10 MB)
    - File can actually be opened as an image

    Args:
        image_bytes: Raw bytes of the uploaded file.
        filename: Original filename (used to check extension).

    Returns:
        Tuple (is_valid: bool, error_message: str or None)
    """
    # Check file extension
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in allowed_extensions:
        return False, f"Unsupported file type '{ext}'. Please upload JPG or PNG images."

    # Check file size (10 MB max)
    max_size_bytes = 10 * 1024 * 1024  # 10 MB
    if len(image_bytes) > max_size_bytes:
        return False, "File is too large. Maximum allowed size is 10 MB."

    # Check if it's actually a valid image
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # This checks if the image data is valid
    except Exception:
        return False, "The uploaded file appears to be corrupted or is not a valid image."

    return True, None


def get_image_thumbnail_base64(image_bytes, size=(128, 128)):
    """
    Create a small base64-encoded thumbnail from image bytes.
    Used to return a preview of the uploaded image in the API response.

    Args:
        image_bytes: Raw bytes of the image.
        size: Thumbnail dimensions as (width, height).

    Returns:
        Base64 encoded string of the thumbnail JPEG.
    """
    import base64

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img.thumbnail(size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)

        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception:
        return None
