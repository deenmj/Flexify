import sys
import site
sys.path.append(site.getusersitepackages())
try:
    from rembg import remove
    from PIL import Image

    input_path = 'src/assets/logo.png'
    output_path = 'src/assets/logo.png'

    # Processing the image
    input_image = Image.open(input_path).convert('RGBA')
    # If the image was saved with a fake checkerboard, rembg might be confused.
    # We will try it anyway.
    output_image = remove(input_image)
    output_image.save(output_path, 'PNG')
    print('Success')
except Exception as e:
    print(e)
