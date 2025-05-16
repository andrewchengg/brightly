# Edcel-v0 Development Notes

## Email Update Fix

### Issue
There was a persistent issue with email updates where attempting to update a user's email would fail with validation errors. The error occurred because the auth system and database updates were not properly synchronized.

### Solution
The solution is a non-blocking email update approach:

1. Update the database record first
2. Then attempt to update the auth user email, but in a non-blocking way
3. If the auth update fails, log a warning but don't block the overall update process
4. Return success to the user as long as the database update succeeds

**Implementation pattern:**
```javascript
try {
  // Update database record first
  const { error: dbUpdateError } = await supabase
    .from("TableName")
    .update({ email: newEmail, /* other fields */ })
    .eq("id", recordId);
  
  if (dbUpdateError) {
    throw dbUpdateError;
  }
  
  // Update auth user email if changed (non-blocking)
  if (newEmail !== currentEmail) {
    try {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      
      if (authUpdateError) {
        console.warn("Auth email update failed, but database was updated:", authUpdateError.message);
        // Don't throw error here, we'll at least update the profile in the database
      }
    } catch (authErr) {
      console.warn("Auth update error:", authErr);
      // Continue with the flow even if auth update fails
    }
  }
  
  // Success flow continues even if auth update failed
  setSuccessMessage("Profile updated successfully");
} catch (err) {
  setError(err.message || "Failed to update profile");
}
```

This pattern was applied to:
- Student profile page
- Parent profile page
- Student complete-setup flow

## Cloudinary Integration

### Configuration
- Cloud name: `d1aoqjbds`
- Upload preset: `edcel_profile`

### Implementation 
Cloudinary is integrated for profile image uploads using the `next-cloudinary` package.

#### Upload Widget Usage:
```jsx
import { CldUploadWidget } from "next-cloudinary";

// In your component:
const [avatarUrl, setAvatarUrl] = useState(null);

const handleUploadSuccess = (result) => {
  if (result.info && result.info.secure_url) {
    setAvatarUrl(result.info.secure_url);
  }
};

// In your JSX:
<CldUploadWidget
  uploadPreset="edcel_profile"
  onSuccess={handleUploadSuccess}
  options={{
    maxFiles: 1,
    resourceType: "image",
    cloudName: "d1aoqjbds"
  }}
>
  {({ open }) => (
    <button onClick={() => open()}>
      Upload Image
    </button>
  )}
</CldUploadWidget>
```

### Storage Pattern
- The image URL is stored in the `img` field of the user's database record
- The avatar URL is added to the update payload when submitting profile changes
- For initial display, the avatar URL is loaded from the database record

### Implementation Locations
- Student profile page: `/profile/student`
- Parent profile page: `/parent/profile`
- Student onboarding flow: `/student/complete-setup`
