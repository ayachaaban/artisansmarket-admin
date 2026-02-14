# Artisans Market - Admin Login Page

This is a professional admin login page with Firebase authentication for the Artisans Market platform.

## Features

✅ Firebase Authentication (Email & Password)
✅ Responsive Design (Bootstrap 5)
✅ Password Toggle (Show/Hide)
✅ "Keep Me Logged In" functionality
✅ Forgot Password feature
✅ Dark Mode Toggle
✅ Empty logo placeholder (ready for your logo)
✅ Error handling with user-friendly messages
✅ Loading states during authentication
✅ Modern, clean UI matching your reference design

## Files Included

1. **admin-login.html** - Main HTML file
2. **styles.css** - Custom CSS styling
3. **script.js** - JavaScript with Firebase authentication logic
4. **README.md** - This file

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** > **Email/Password** sign-in method
4. Go to **Project Settings** > **Your apps** > **Web app**
5. Copy your Firebase configuration
6. Open `script.js` and replace the config object (lines 6-13):

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_AUTH_DOMAIN_HERE",
    projectId: "YOUR_PROJECT_ID_HERE",
    storageBucket: "YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE"
};
```

### 2. Create Admin User in Firebase

1. Go to Firebase Console > Authentication > Users
2. Click "Add user"
3. Enter email and password for your admin account
4. Save the user

### 3. Add Your Logo

**Option 1: Simple Image Replacement**
1. In `admin-login.html`, find the `.logo-placeholder` div (around line 78)
2. Replace the entire div content with:
```html
<div class="logo-placeholder">
    <img src="path/to/your/logo.png" alt="Artisans Market Logo">
</div>
```

3. In `styles.css`, update the `.logo-placeholder` styles (around line 189):
```css
.logo-placeholder {
    width: 280px;
    height: 280px;
    margin: 0 auto 2rem;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-placeholder img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
```

### 4. Customize Colors (After Creating Logo)

In `styles.css`, update the color variables (lines 1-11) to match your brand:

```css
:root {
    --primary-color: #2c7a7b;        /* Your primary brand color */
    --primary-hover: #285e61;        /* Darker shade for hover */
    --text-dark: #2d3748;            /* Dark text color */
    --text-light: #718096;           /* Light text color */
    --border-color: #e2e8f0;         /* Border color */
    --bg-light: #f7fafc;             /* Light background */
    --bg-white: #ffffff;             /* White background */
    --link-color: #667eea;           /* Link color */
    --error-color: #fc8181;          /* Error message color */
}
```

### 5. Update Dashboard Redirect

In `script.js`, change the redirect URL (line 140):
```javascript
window.location.href = 'dashboard.html'; // Change to your actual dashboard page
```

## Testing the Login Page

1. Open `admin-login.html` in a web browser
2. Enter the admin email and password you created in Firebase
3. Click "Sign In"
4. If successful, you'll see a success message and redirect to dashboard

## Features Explained

### Password Toggle
- Click the eye icon to show/hide password

### Keep Me Logged In
- When checked: User stays logged in even after closing browser
- When unchecked: User is logged out when browser is closed

### Forgot Password
- Sends password reset email via Firebase
- User must enter email first

### Dark Mode
- Click the moon/sun icon in bottom left
- Preference is saved to localStorage

### Error Messages
- Clear, user-friendly error messages for common issues
- Invalid email format
- Wrong password
- Account not found
- Too many attempts
- Network errors

## Browser Compatibility

✅ Chrome (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Edge (latest)
✅ Mobile browsers

## Security Features

1. Firebase handles password encryption
2. Secure session management
3. HTTPS recommended for production
4. Protection against brute force attacks
5. Password reset via email verification

## Deployment

### Option 1: Firebase Hosting
```bash
firebase init hosting
firebase deploy
```

### Option 2: Any Web Server
Upload all files to your web server. Make sure HTTPS is enabled.

## Troubleshooting

### "Firebase not initialized" error
- Make sure you've added your Firebase config in `script.js`
- Check that Firebase libraries are loading (check browser console)

### "Operation not allowed" error
- Enable Email/Password authentication in Firebase Console

### Login not working
- Check Firebase Console > Authentication > Users
- Verify the email/password combination exists
- Check browser console for detailed error messages

### Redirect not working
- Make sure `dashboard.html` exists
- Update the redirect URL in `script.js` line 140

## Next Steps

1. ✅ Set up Firebase configuration
2. ✅ Create admin user in Firebase
3. ✅ Add your logo
4. ✅ Customize colors to match your brand
5. ✅ Create dashboard.html page
6. ✅ Test login functionality
7. ✅ Deploy to production

## Support

For issues or questions:
- Check Firebase documentation: https://firebase.google.com/docs/auth
- Check Bootstrap documentation: https://getbootstrap.com/docs/5.3/

## License

This code is provided as-is for your FYP project.

---

**Good luck with your Artisans Market project! 🚀**
