# GitHub Copilot Prompt for Firebase Backend Implementation

## Project Overview

The goal is to develop the backend for an admin dashboard web application. This dashboard will provide administrators with comprehensive tools to manage users (customers and artists), monitor platform activity, handle reported content, and oversee payment/subscription statuses. The frontend will be built using HTML, CSS, and JavaScript, and the backend will be powered by Firebase.

## Technology Stack

*   **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
*   **Frontend (for context)**: HTML, CSS, JavaScript
*   **AI Assistant**: GitHub Copilot with Claude integration

## Core Functionality and Firebase Implementation Details

### 1. Admin Authentication (Firebase Authentication)

*   Implement secure admin login using email and password.
*   Ensure only authenticated administrators can access the dashboard functionalities.
*   Consider Firebase Authentication for managing admin user accounts.

### 2. Admin Management (Firebase Authentication & Firestore)

*   **Add Admin**: Allow super-admins to create new admin accounts with specified email and password.
*   **Delete Admin**: Allow super-admins to remove existing admin accounts.
*   **Edit Admin**: Allow super-admins to modify admin account details (e.g., password reset, role assignment).
*   Implement role-based access control (RBAC) to differentiate between super-admins and regular admins, if applicable.

### 3. Dashboard Home (Firebase Firestore & Cloud Functions)

*   **Overview Statistics**: Fetch and display real-time data for:
    *   Total customers
    *   Total artists (distinguish between paid/active and inactive)
    *   Total posts
    *   Active subscriptions
    *   Reported posts count
*   **Optional Charts**: Provide data endpoints for weekly/monthly trends (e.g., new users, new posts, revenue).
*   This will involve querying Firestore collections and potentially aggregating data using Firebase Cloud Functions.

### 4. Users Management (Firebase Firestore & Cloud Functions)

*   **Display**: Retrieve and present a table of all customer users with their Name, Email, Registration Date, and Account Type.
*   **Actions**: Implement backend logic for:
    *   **Suspend User**: Mark a user account as suspended (e.g., by updating a `status` field in Firestore).
    *   **Delete User**: Permanently remove a user account and associated data (requires careful consideration of data integrity and Firebase security rules).
*   **Search & Sort**: Implement efficient querying and sorting capabilities based on Name, Email, Registration Date, and Account Type.

### 5. Artists Management (Firebase Firestore & Cloud Functions)

*   **Display**: Retrieve and present a table of all artists with their Name, Email, Rating, Subscription Status, and Total Posts.
*   **Actions**: Implement backend logic for:
    *   **Suspend Artist**: Mark an artist account as suspended.
    *   **Delete Artist**: Permanently remove an artist account and associated data.
*   **Filter**: Implement filtering by Rating, Subscription Status, and Number of Posts.

### 6. Reported Posts (Firebase Firestore & Cloud Functions)

*   **Display**: Fetch and present posts that have been flagged by customers. Include Post thumbnail, Artist Name, Report Reason, Number of Reports, and Date.
*   **Actions**: Implement backend logic for:
    *   **Approve Post**: Clear all reports for a post and keep it live.
    *   **Remove Post**: Delete the post and potentially notify the artist.
    *   **Message Artist**: (Optional) Provide a mechanism to send a notification or message to the artist regarding the report.

### 7. Payments / Subscriptions (Firebase Firestore & Cloud Functions)

*   **Display**: Retrieve and present a table with Artist Name, Email, Payment Status, Payment Date, and Subscription Expiry.
*   **Actions**: Implement backend logic for:
    *   **Suspend Unpaid Accounts**: Automatically or manually suspend artist accounts with overdue payments.
*   **Optional Statistics**: Provide data endpoints for monthly revenue and subscription statistics.

### 8. Sidebar Navigation

*   The backend should support the data retrieval for the following sections:
    *   Dashboard (Home)
    *   Users
    *   Artists
    *   Reported Posts
    *   Payments / Subscriptions
    *   Settings / Logout

## Firebase Firestore Database Structure

Copilot, please adhere to the following Firestore collection and document structure:

| Collection | Fields |
| :--------- | :----- |
| `Users`    | `uid` (string), `name` (string), `email` (string), `profilePhoto` (string), `accountType` (string: 'customer'/'artist'), `createdAt` (timestamp), `status` (string: 'active'/'suspended') |
| `Admins`   | `uid` (string), `email` (string), `role` (string: 'super-admin'/'admin'), `createdAt` (timestamp) |
| `Artists`  | `uid` (string), `name` (string), `email` (string), `profilePhoto` (string), `bio` (string), `specialty` (string), `location` (string), `ratingAvg` (number), `subscriptionStatus` (string: 'active'/'inactive'/'trial'), `paymentDate` (timestamp), `subscriptionExpiry` (timestamp), `posts` (array of post IDs), `status` (string: 'active'/'suspended') |
| `Posts`    | `postId` (string), `title` (string), `description` (string), `images` (array of strings), `category` (string), `price` (number), `artistId` (string), `createdAt` (timestamp), `reportedCount` (number), `reportedBy` (array of user IDs), `status` (string: 'active'/'reported'/'removed') |
| `Chat`     | `chatId` (string), `senderId` (string), `receiverId` (string), `message` (string), `timestamp` (timestamp), `readStatus` (boolean) |
| `Feedback` | `feedbackId` (string), `customerId` (string), `artistId` (string), `rating` (number), `message` (string), `timestamp` (timestamp) |
| `Reports`  | `reportId` (string), `postId` (string), `reportedBy` (string: userId), `reason` (string), `timestamp` (timestamp) |
| `Payments` | `paymentId` (string), `artistId` (string), `amount` (number), `paymentMethod` (string), `paymentDate` (timestamp), `status` (string: 'completed'/'failed'/'pending') |

## Backend Implementation Guidelines for Copilot (with Claude Integration)

1.  **Firebase SDK Integration**: Provide JavaScript code snippets for initializing Firebase in a web environment and interacting with Firestore and Authentication.
2.  **Cloud Functions**: Generate Node.js (TypeScript preferred) Firebase Cloud Functions for complex operations that require server-side logic, such as:
    *   Aggregating dashboard statistics.
    *   Handling user/artist deletion (to ensure all related data is removed).
    *   Processing reported posts (e.g., deleting posts, notifying artists).
    *   Automating subscription status updates or suspensions.
    *   Managing admin accounts (add, delete, edit).

3.  **Firestore Security Rules**: Generate robust Firestore Security Rules to ensure that:
    *   Only authenticated administrators can perform write operations on sensitive collections (`Users`, `Artists`, `Posts`, `Payments`, `Reports`, `Admins`).
    *   Super-admins have full control over the `Admins` collection, while regular admins might have read-only access or limited write access.
    *   Users can only read/write their own `Chat` and `Feedback` data.
    *   Public data (e.g., `Posts` for display) can be read by all authenticated users.
4.  **API Design**: Suggest clear API endpoint structures (if using Cloud Functions as HTTP endpoints) or direct Firebase SDK calls for the frontend to interact with the backend.
5.  **Error Handling**: Include basic error handling mechanisms for all backend operations.
6.  **Leverage Claude**: For any complex logic, data aggregation, or security rule generation, utilize Claude's advanced reasoning capabilities to produce highly optimized and secure code. Specifically, ask Claude to review and refine the security rules for optimal protection and performance.
## Example Requests to Copilot

"Copilot, generate the Firebase Cloud Function (Node.js/TypeScript) to add a new admin. This function should take an `email`, `password`, and `role` (e.g., \'admin\', \'super-admin\') as input, create a new user in Firebase Authentication, and add a corresponding document to the `Admins` collection. Ensure proper error handling, authentication checks, and role-based authorization (only super-admins can add new admins). Also, provide the corresponding Firestore Security Rules to allow only authenticated super-admins to call this function.\"

"Copilot, generate the Firebase Cloud Function (Node.js/TypeScript) to delete an artist. This function should take an `artistId` as input, delete the artist\'s document from the `Artists` collection, and also delete all associated `Posts` and `Feedback` documents where `artistId` matches. Ensure proper error handling and authentication checks. Also, provide the corresponding Firestore Security Rules to allow only authenticated admins to call this function.\"
This prompt aims to guide Copilot in generating a secure, scalable, and functional Firebase backend for the described admin dashboard, leveraging Claude for enhanced code quality and security considerations.
