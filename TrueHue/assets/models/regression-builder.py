import nbformat as nbf

# Create a new Jupyter notebook
nb = nbf.v4.new_notebook()

# Define the cells with explanations and code
cells = [
    nbf.v4.new_markdown_cell("# Wood Veneer Color Analysis AI Model\n"
                             "This notebook processes wood veneer images, extracts color features, "
                             "and predicts their position on a predefined color spectrum using real data."),

    nbf.v4.new_markdown_cell("## Step 1: Import Required Libraries"),
    nbf.v4.new_code_cell("""
import os
import cv2
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
    """),

    nbf.v4.new_markdown_cell("## Step 2: Image Preprocessing"),
    nbf.v4.new_code_cell("""
def extract_lab_features(image_path):
    \"\"\"Extract L*, a*, b* mean values from an image.\"\"\"
    image = cv2.imread(image_path)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_mean = np.mean(lab[:,:,0])  # Lightness (L*) component
    a_mean = np.mean(lab[:,:,1])  # Red-Green component
    b_mean = np.mean(lab[:,:,2])  # Blue-Yellow component
    return l_mean, a_mean, b_mean
    """),

    nbf.v4.new_markdown_cell("## Step 3: Load Dataset and Extract Features"),
    nbf.v4.new_code_cell("""
dataset_path = "dataset/in_range"  # Update this to your dataset folder

# Collect data
data = []
for filename in os.listdir(dataset_path):
    if filename.endswith(".jpg") or filename.endswith(".png"):
        image_path = os.path.join(dataset_path, filename)
        l_mean, a_mean, b_mean = extract_lab_features(image_path)
        data.append([image_path, l_mean, a_mean, b_mean, 0.0])  # 0.0 = Ideal (Just Right)

# Convert to DataFrame
df = pd.DataFrame(data, columns=["image_path", "L*", "a*", "b*", "position_score"])
df.to_csv("real_veneer_dataset.csv", index=False)
print("Dataset saved! Total samples:", len(df))
    """),

    nbf.v4.new_markdown_cell("## Step 4: Augment Data with Darker and Lighter Samples"),
    nbf.v4.new_code_cell("""
def adjust_lightness(image_path, factor):
    \"\"\"Increase or decrease lightness (L*) to create synthetic darker/lighter samples.\"\"\"
    image = cv2.imread(image_path)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Scale L* values
    l = np.clip(l * factor, 0, 255).astype(np.uint8)

    # Merge channels back
    adjusted_lab = cv2.merge((l, a, b))
    adjusted_image = cv2.cvtColor(adjusted_lab, cv2.COLOR_LAB2BGR)
    
    return adjusted_image

# Create synthetic darker and lighter images
augmented_data = []
for index, row in df.iterrows():
    image_path, l_mean, a_mean, b_mean = row["image_path"], row["L*"], row["a*"], row["b*"]
    
    # Darker sample (Too Dark)
    dark_img = adjust_lightness(image_path, 0.8)
    dark_path = image_path.replace(".jpg", "_dark.jpg")
    cv2.imwrite(dark_path, dark_img)
    augmented_data.append([dark_path, l_mean * 0.8, a_mean, b_mean, -1.0])  # -1 = Too Dark
    
    # Lighter sample (Too Light)
    light_img = adjust_lightness(image_path, 1.2)
    light_path = image_path.replace(".jpg", "_light.jpg")
    cv2.imwrite(light_path, light_img)
    augmented_data.append([light_path, l_mean * 1.2, a_mean, b_mean, 1.0])  # 1 = Too Light

# Add synthetic samples to dataset
augmented_df = pd.DataFrame(augmented_data, columns=["image_path", "L*", "a*", "b*", "position_score"])
df = pd.concat([df, augmented_df])

df.to_csv("augmented_veneer_dataset.csv", index=False)
print("Augmented dataset saved! Total samples:", len(df))
    """),

    nbf.v4.new_markdown_cell("## Step 5: Train the AI Model on Real Data"),
    nbf.v4.new_code_cell("""
df = pd.read_csv("augmented_veneer_dataset.csv")

# Extract features and target
X = df[["L*", "a*", "b*"]]
y = df["position_score"]

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print("Model trained on real veneer data!")
    """),

    nbf.v4.new_markdown_cell("## Step 6: Predict Position of a New Sample"),
    nbf.v4.new_code_cell("""
def predict_position(image_path, model):
    \"\"\"Predict where a veneer sample falls on the color spectrum.\"\"\"
    l_mean, a_mean, b_mean = extract_lab_features(image_path)
    position = model.predict([[l_mean, a_mean, b_mean]])[0]
    return position

image_path = "new_veneer_sample.jpg"  # Replace with a new image
position_score = predict_position(image_path, model)

print(f"📌 Sample falls at position: {position_score:.2f} (-1 = Dark, 0 = Ideal, 1 = Light)")
    """),

    nbf.v4.new_markdown_cell("## Step 7: Compute Confidence Score"),
    nbf.v4.new_code_cell("""
def compute_confidence_score(position_score):
    \"\"\"Convert position score to a confidence percentage (0-100%).\"\"\"
    return 100 * (1 - abs(position_score))

confidence = compute_confidence_score(position_score)
print(f"🎯 Confidence: {confidence:.2f}% match to ideal medium cherry.")
    """),

    nbf.v4.new_markdown_cell("## Step 8: Visualize Sample Position on the Spectrum"),
    nbf.v4.new_code_cell("""
def plot_color_match(sample_L, ideal_L=65, dark_threshold=55, light_threshold=75):
    \"\"\"
    Visualizes where the sample falls on the Too Dark → Just Right → Too Light spectrum.
    \"\"\"
    plt.figure(figsize=(8, 2))
    plt.axvline(ideal_L, color='green', linestyle='--', label="Ideal Medium Cherry")
    plt.axvline(sample_L, color='red', linestyle='-', label=f"Sample L* = {sample_L:.2f}")

    plt.xticks([dark_threshold, ideal_L, light_threshold], ["Too Dark", "Just Right", "Too Light"])
    plt.yticks([])
    plt.legend()
    plt.title("Wood Veneer Color Position")
    plt.show()

plot_color_match(position_score * 10 + 65)
    """)
]

# Add cells to the notebook
nb.cells.extend(cells)

# Save as .ipynb file
notebook_filename = "wood_veneer_ai_model.ipynb"
with open(notebook_filename, "w") as f:
    nbf.write(nb, f)

notebook_filename
