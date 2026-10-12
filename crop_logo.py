from PIL import Image
import numpy as np

img = Image.open("public/groom-broom-logo.jpg").convert("RGBA")
arr = np.array(img, dtype=np.uint8)

# The logo consists of dark elements (black car/bike/text) and orange highlights
is_logo = (arr[:, :, 0] < 80) | ((arr[:, :, 0] > 160) & (arr[:, :, 2] < 90))
coords = np.argwhere(is_logo)
y0, x0 = coords.min(axis=0)
y1, x1 = coords.max(axis=0)

# Padding
pad_x = 16
pad_y = 12
y0 = max(0, y0 - pad_y)
x0 = max(0, x0 - pad_x)
y1 = min(arr.shape[0], y1 + pad_y)
x1 = min(arr.shape[1], x1 + pad_x)

cropped = img.crop((x0, y0, x1, y1))
cropped.save("public/groom-broom-logo-cropped.png")
print(f"Cropped saved! Bbox: ({x0}, {y0}, {x1}, {y1}), Size: {cropped.size}")

# Create high-precision transparent version
c_arr = np.array(cropped, dtype=np.float32)
# Distance from pure white (255, 255, 255)
dist_from_white = np.sqrt(
    (255 - c_arr[:, :, 0])**2 +
    (255 - c_arr[:, :, 1])**2 +
    (255 - c_arr[:, :, 2])**2
)

# Smooth alpha ramp
# If dist_from_white < 12 -> alpha = 0 (background)
# If dist_from_white > 45 -> alpha = 255 (fully solid logo)
alpha = np.clip((dist_from_white - 12) / (45 - 12) * 255.0, 0, 255).astype(np.uint8)

transparent_img = np.array(cropped).copy()
transparent_img[:, :, 3] = alpha

# Clean fringe on low alpha
low_alpha = alpha < 20
transparent_img[low_alpha] = [0, 0, 0, 0]

trans_pil = Image.fromarray(transparent_img, "RGBA")
trans_pil.save("public/groom-broom-logo-transparent.png")
print("Transparent logo saved!")

# Create dark-mode version (crisp white car & text, keeping orange vivid)
dark_mode = transparent_img.copy()
r = dark_mode[:, :, 0].astype(int)
g = dark_mode[:, :, 1].astype(int)
b = dark_mode[:, :, 2].astype(int)

# Detect orange: High red, noticeable gap between red and blue
is_orange = (r > 140) & (b < 110) & (r > g + 20)

# All non-orange content (black car lines, motorcycle, "A HAPPY RIDE", wheel rims) becomes #FAFAF9
is_foreground = (alpha > 30) & (~is_orange)
dark_mode[is_foreground, 0] = 250
dark_mode[is_foreground, 1] = 250
dark_mode[is_foreground, 2] = 249

dark_pil = Image.fromarray(dark_mode, "RGBA")
dark_pil.save("public/groom-broom-logo-dark.png")
print("Dark-mode logo saved!")
