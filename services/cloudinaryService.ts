
// IMPORTANT: For this to work, you need to set up an "unsigned upload preset" in your Cloudinary account.
// 1. Go to your Cloudinary dashboard -> Settings (gear icon) -> Upload.
// 2. Scroll down to "Upload presets", click "Add upload preset".
// 3. Change "Signing Mode" from "Signed" to "Unsigned".
// 4. Set the "Upload preset name" to exactly "ansinhso_unsigned_preset".
// 5. Save the preset.

const CLOUD_NAME = "diutnceax"; // Your cloud name from the prompt
const UPLOAD_PRESET = "ansinhso_unsigned_preset"; // This name MUST match the one you create in Cloudinary

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  // Determine resource type based on file mime type
  // PDFs and Docs should be treated as 'raw' to avoid "PDF delivery" security restrictions (401)
  // associated with the 'image' pipeline in some Cloudinary accounts.
  let resourceType = 'auto';
  if (
      file.type === 'application/pdf' || 
      file.type.includes('word') || 
      file.type.includes('document')
  ) {
      resourceType = 'raw';
  }

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || 'Upload to Cloudinary failed';
      console.error("Cloudinary error response:", errorData);
      // Pass a more descriptive error message to the UI
      throw new Error(`Lỗi Cloudinary: ${errorMessage}`);
    }

    const data = await response.json();
    return data.secure_url; // Returns the HTTPS URL of the uploaded file
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw error;
  }
};
