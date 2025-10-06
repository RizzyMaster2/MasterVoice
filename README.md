
# MasterVoice

MasterVoice is a feature-rich, real-time chat application built with a modern, scalable tech stack. It serves as a robust foundation for building communication platforms, featuring direct messaging, voice calls, a complete friend system, and AI-powered capabilities.

![MasterVoice Screenshot](https://picsum.photos/seed/mastervoice/1200/800)

## Features

- **Real-time Direct Messaging:** Instantly chat one-on-one with friends.
- **HD Voice Calls:** Crystal-clear, low-latency voice communication powered by WebRTC.
- **Full Friend System:** Send, accept, and decline friend requests to build your network.
- **User Presence:** See who's online at a glance.
- **Profile Personalization:** Customize user profiles with avatars and bios.
- **Admin & Business Dashboards:** Specialized views for administrators and business-tier users.
- **AI-Powered Suggestions:** Utilizes Genkit with Google's Gemini to suggest new connections.
- **Secure Authentication:** Built-in signup, login, and password reset flows using Supabase.
- **Dark Mode:** Beautifully crafted light and dark themes.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Backend & Auth:** [Supabase](https://supabase.io/)
- **AI Integration:** [Genkit (Google)](https://firebase.google.com/docs/genkit)
- **UI:** [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** React Hooks & Context API
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

<<<<<<< HEAD
=======
## 🔐 Voice Encryption

MasterVoice uses WebRTC to power HD voice calls, ensuring secure, private communication between users. Here's how encryption is handled across the stack:

### 1. End-to-End Media Encryption (SRTP)

- **Protocol**: Secure Real-Time Transport Protocol  
- **Purpose**: Encrypts voice packets during transmission  
- **Method**: Uses AES (Advanced Encryption Standard) to scramble audio data so only the intended recipient can decrypt it

> Your voice is converted to digital packets → encrypted → sent → decrypted only by the recipient

### 2. Key Exchange (DTLS)

- **Protocol**: Datagram Transport Layer Security  
- **Purpose**: Securely negotiates encryption keys between peers  
- **Method**: DTLS handshake ensures both users agree on a shared secret without exposing it

> DTLS handles the “handshake” so both sides know how to encrypt/decrypt without anyone else listening in

### 3. Signaling Layer Encryption

- **Transport**: HTTPS or WebSocket TLS  
- **Purpose**: Coordinates call setup (who’s calling whom, ICE candidates, etc.)  
- **Method**: Encrypted via TLS to prevent metadata leaks or spoofing

> While signaling doesn’t carry voice data, it’s still encrypted to protect call setup

### 4. Relay Servers (TURN)

- **Fallback**: If direct peer-to-peer fails, media is relayed through TURN servers  
- **Encryption**: TURN relays are SRTP-compliant, so voice remains encrypted end-to-end

---

### 🔒 Summary

| Layer             | Protocol | Encryption |
|------------------|----------|------------|
| Voice Media      | SRTP     | AES        |
| Key Exchange     | DTLS     | TLS        |
| Signaling        | HTTPS/WSS| TLS        |
| Relay (TURN)     | SRTP     | AES        |

MasterVoice never stores voice data—calls are ephemeral and encrypted from end to end. Encryption is automatic and enforced by WebRTC, requiring no setup from users.


>>>>>>> b3ba94dec2ea2ca462eef00074b1d874e91d0db8
## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- Node.js (v18 or newer recommended)
- npm, yarn, or pnpm

### 1. Set Up Environment Variables

You will need to connect the application to a Supabase project to handle the database, authentication, and storage.

1.  Create a new project on [Supabase](https://database.new).
2.  Go to your Supabase project's **Settings > API**.
3.  Create a `.env.local` file in the root of this project by copying the example file:
    ```bash
    cp .env.example .env.local
    ```
4.  Find your **Project URL** and **anon public key** in the Supabase dashboard and add them to your `.env.local` file.
5.  Set an email address that will be granted admin privileges.

Your `.env.local` file should look like this:

```plaintext
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_ADMIN_EMAILS=your-admin-email@example.com
```

<<<<<<< HEAD
=======
## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you’d like to change.

Please make sure to update tests as appropriate.

>>>>>>> b3ba94dec2ea2ca462eef00074b1d874e91d0db8
### 2. Install Dependencies

Navigate to the project directory and install the required packages.

```bash
npm install
```

### 3. Run the Development Server

Once the dependencies are installed, you can start the development server.

```bash
npm run dev
```

The application should now be running at [http://localhost:9002](http://localhost:9002).

## Building for Production

To create a production-ready build of the application, run the following command:

```bash
npm run build
```

This will create an optimized build in the `.next` directory. You can start the production server with `npm start`.
