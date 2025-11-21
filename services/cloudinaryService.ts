
const CLOUD_NAME = "diutnceax"; // Your cloud name from the prompt
const UPLOAD_PRESET = "ansinhso_unsigned_preset"; // This name MUST match the one you create in Cloudinary

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  // Note: We removed formData.append('type', 'upload') because unsigned uploads use the preset's configuration.

  // FIX: Always use 'auto'. 
  // - PDFs sent as 'auto' are treated by Cloudinary as 'image' type (viewable in browser, public by default).
  // - DOC/DOCX sent as 'auto' are treated as 'raw' type (downloadable).
  // Previously forcing 'raw' for PDFs caused 401 errors because Raw files often have stricter security/ACLs than Images.
  const resourceType = 'auto';

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || 'Upload to Cloudinary failed';
      console.error("Cloudinary error response:", errorData);
      throw new Error(`Lỗi Cloudinary: ${errorMessage}`);
    }

    const data = await response.json();
    
    // FIX: Trim the URL to remove any potential trailing whitespace which causes broken links
    const secureUrl = data.secure_url ? data.secure_url.trim() : '';
    return secureUrl; 

  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw error;
  }
};
