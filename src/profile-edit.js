document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  
  // Profile bar functionality
  const profileBar = document.getElementById("profile-bar");
  
  if (profileBar) {
    try {
      const res = await fetch("http://localhost:8080/api/customers/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        
        // Check for stored profile photo
        const storedPhoto = localStorage.getItem("userProfilePhoto");
        let avatarContent = "";
        
        if (storedPhoto) {
          avatarContent = `<img src="${storedPhoto}" alt="Profile Photo">`;
        } else if (profile.profilePhoto) {
          avatarContent = `<img src="${profile.profilePhoto}" alt="Profile Photo">`;
        } else {
          const initials = (profile.name || profile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
          avatarContent = `<span>${initials}</span>`;
        }
        
        profileBar.innerHTML = `
          <div class="profile-info" id="profileInfo" style="cursor:pointer;display:flex;align-items:center;gap:8px;">
            <span class="profile-name">${profile.name || profile.username}</span>
            <span class="profile-caret">&#9662;</span>
          </div>
          <div class="profile-dropdown" id="profileDropdown" style="display:none;">
            <a href="dashboard.html">Dashboard</a>
            <a href="profile-edit.html">Edit Profile</a>
            <a href="order.html">My Orders</a>
            <a href="#" id="logoutBtn">Logout</a>
          </div>
        `;
        
        // Dropdown logic
        const profileInfo = document.getElementById("profileInfo");
        const profileDropdown = document.getElementById("profileDropdown");
        
        if (profileInfo && profileDropdown) {
          profileInfo.addEventListener("click", () => {
            profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
          });
          
          document.addEventListener("click", (e) => {
            if (!profileBar.contains(e.target)) {
              profileDropdown.style.display = "none";
            }
          });
          
          document.getElementById("logoutBtn").onclick = function() {
            localStorage.removeItem("token");
            localStorage.removeItem("userProfilePhoto");
            window.location.href = "landingpage.html";
          };
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("userProfilePhoto");
        profileBar.innerHTML = "";
      }
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("userProfilePhoto");
      profileBar.innerHTML = "";
    }
  }
  
  const avatarDiv = document.getElementById("profileAvatar");
  const avatarContainer = document.querySelector(".profile-edit-avatar-container");
  const avatarUploadOverlay = document.getElementById("avatarUploadOverlay");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const form = document.getElementById("profileEditForm");
  const msgDiv = document.getElementById("profileEditMsg");
  const saveBtn = document.querySelector(".save-btn");

  // Photo upload functionality
  avatarContainer.addEventListener("click", () => {
    profilePhotoInput.click();
  });

  profilePhotoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      showMessage("Please select a valid image file.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showMessage("Image size should be less than 5MB.", "error");
      return;
    }

    try {
      // Show loading state
      saveBtn.innerHTML = '<div class="loading-spinner"></div> Uploading...';
      saveBtn.disabled = true;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profilePhoto", file);

      const res = await fetch("http://localhost:8080/api/customers/profile/photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Failed to upload photo");

      // Update avatar display and store in localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoDataUrl = e.target.result;
        console.log("Photo uploaded successfully, data URL length:", photoDataUrl.length);
        avatarDiv.innerHTML = `<img src="${photoDataUrl}" alt="Profile Photo">`;
        // Store photo in localStorage for use in other pages
        localStorage.setItem("userProfilePhoto", photoDataUrl);
        console.log("Photo stored in localStorage");
      };
      reader.readAsDataURL(file);

      showMessage("Profile photo uploaded successfully!", "success");
      
    } catch (error) {
      console.error("Photo upload error:", error);
      showMessage("Failed to upload photo. Please try again.", "error");
    } finally {
      // Reset button state
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      saveBtn.disabled = false;
    }
  });

  // Fetch user profile
  try {
    const res = await fetch("http://localhost:8080/api/customers/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch profile");
    
    const profile = await res.json();
    
    // Fill form fields
    form.name.value = profile.name || "";
    form.username.value = profile.username || "";
    form.email.value = profile.email || "";
    form.dob.value = profile.dob || "";
    
    // Set avatar - check for existing photo first
    const storedPhoto = localStorage.getItem("userProfilePhoto");
    console.log("Profile data:", profile);
    console.log("Stored photo:", storedPhoto ? "Present" : "Not found");
    console.log("Backend photo:", profile.profilePhoto ? "Present" : "Not found");
    
    if (storedPhoto) {
      console.log("Using stored photo");
      avatarDiv.innerHTML = `<img src="${storedPhoto}" alt="Profile Photo">`;
    } else if (profile.profilePhoto) {
      console.log("Using backend photo");
      avatarDiv.innerHTML = `<img src="${profile.profilePhoto}" alt="Profile Photo">`;
      // Also store it in localStorage for future use
      localStorage.setItem("userProfilePhoto", profile.profilePhoto);
    } else {
      console.log("Using initials fallback");
      // Set initials as fallback
      const initials = (profile.name || profile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
      avatarDiv.innerHTML = `<span>${initials}</span>`;
    }
    
  } catch (e) {
    showMessage("Failed to load profile. Please login again.", "error");
    setTimeout(() => window.location.href = "login.html", 2000);
    return;
  }

  // Handle form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (saveBtn.disabled) return; // Prevent double submission
    
    const updatedProfile = {
      name: form.name.value.trim(),
      dob: form.dob.value
    };

    try {
      // Show loading state
      saveBtn.innerHTML = '<div class="loading-spinner"></div> Saving...';
      saveBtn.disabled = true;

      const res = await fetch("http://localhost:8080/api/customers/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });

      if (!res.ok) throw new Error("Failed to update profile");

      showMessage("Profile updated successfully!", "success");
      
      // Refresh profile data to ensure we have the latest info
      setTimeout(async () => {
        try {
          const refreshRes = await fetch("http://localhost:8080/api/customers/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (refreshRes.ok) {
            const updatedProfile = await refreshRes.json();
            console.log("Refreshed profile data:", updatedProfile);
            
            // Update form fields with latest data
            form.name.value = updatedProfile.name || "";
            form.username.value = updatedProfile.username || "";
            form.email.value = updatedProfile.email || "";
            form.dob.value = updatedProfile.dob || "";
            
            // Update avatar with latest photo
            const storedPhoto = localStorage.getItem("userProfilePhoto");
            if (storedPhoto) {
              avatarDiv.innerHTML = `<img src="${storedPhoto}" alt="Profile Photo">`;
            } else if (updatedProfile.profilePhoto) {
              avatarDiv.innerHTML = `<img src="${updatedProfile.profilePhoto}" alt="Profile Photo">`;
              localStorage.setItem("userProfilePhoto", updatedProfile.profilePhoto);
            } else {
              const initials = (updatedProfile.name || updatedProfile.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
              avatarDiv.innerHTML = `<span>${initials}</span>`;
            }
          }
        } catch (error) {
          console.error("Error refreshing profile:", error);
        }
      }, 1000);
      
    } catch (e) {
      console.error("Profile update error:", e);
      showMessage("Failed to update profile. Please try again.", "error");
    } finally {
      // Reset button state
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      saveBtn.disabled = false;
    }
  });

  function showMessage(message, type = "success") {
    msgDiv.textContent = message;
    msgDiv.className = `profile-edit-msg ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === "success") {
      setTimeout(() => {
        msgDiv.textContent = "";
        msgDiv.className = "profile-edit-msg";
      }, 3000);
    }
  }
}); 