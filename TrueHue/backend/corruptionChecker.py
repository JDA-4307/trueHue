from PIL import Image

def check_image_corruption(image_path):
    try:
        with Image.open(image_path) as img:
            img.verify()  # Only verifies if the file is readable
        return True  # Image is valid
    except Exception as e:
        print(f"Image is corrupted: {e}")
        return False  # Image is corrupted

# Example usage
image_path = "./desertOak.jpeg"
is_valid = check_image_corruption(image_path)
print(f"Image valid: {is_valid}")
