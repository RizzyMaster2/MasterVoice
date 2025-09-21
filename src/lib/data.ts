export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
  bio: string;
};

export type Message = {
  id: string;
  text: string;
  timestamp: string;
  senderId: string;
};

// Mock data - replace with data from your database
export const users: User[] = [
  {
    id: 'user1',
    name: 'Alice',
    avatarUrl: 'https://picsum.photos/seed/101/200/200',
    isOnline: true,
    bio: 'Frontend developer and cat lover. Building beautiful things with React and Next.js.',
  },
  {
    id: 'user2',
    name: 'Bob',
    avatarUrl: 'https://picsum.photos/seed/102/200/200',
    isOnline: false,
    bio: 'Backend engineer specializing in Node.js and GraphQL. Hiking on weekends.',
  },
  {
    id: 'user3',
    name: 'Charlie',
    avatarUrl: 'https://picsum.photos/seed/103/200/200',
    isOnline: true,
    bio: 'UX/UI designer with a passion for minimalist design and accessibility.',
  },
  {
    id: 'user4',
    name: 'Diana',
    avatarUrl: 'https://picsum.photos/seed/104/200/200',
    isOnline: true,
    bio: 'AI researcher exploring the frontiers of generative models.',
  },
  {
    id: 'user5',
    name: 'Eve',
    avatarUrl: 'https://picsum.photos/seed/105/200/200',
    isOnline: false,
    bio: 'Project manager and scrum master. Loves agile methodologies and coffee.',
  },
  {
    id: 'user6',
    name: 'Frank',
    avatarUrl: 'https://picsum.photos/seed/106/200/200',
    isOnline: false,
    bio: 'Aspiring musician and songwriter. Let\'s talk about music!',
  },
  {
    id: 'user7',
    name: 'Grace',
    avatarUrl: 'https://picsum.photos/seed/107/200/200',
    isOnline: true,
    bio: 'Data scientist who loves to find patterns in chaos.',
  }
];

// This is now handled by Supabase Auth.
// You will need a different way to get the current user.
export const currentUser = users[0];

export const messages: Record<string, Message[]> = {
  user2: [
    { id: 'msg1', text: 'Hey Alice! How are you?', timestamp: '10:00 AM', senderId: 'user2' },
    { id: 'msg2', text: 'I\'m good, Bob! Just working on a new Next.js project. You?', timestamp: '10:01 AM', senderId: 'user1' },
    { id: 'msg3', text: 'Nice! I\'m debugging a tricky GraphQL resolver. The usual fun!', timestamp: '10:02 AM', senderId: 'user2' },
    { id: 'msg4', text: 'Haha, I can imagine. Let me know if you need a second pair of eyes.', timestamp: '10:03 AM', senderId: 'user1' },
  ],
  user3: [
    { id: 'msg5', text: 'Hey, I saw your latest design on Dribbble. It looks amazing!', timestamp: 'Yesterday', senderId: 'user1' },
    { id: 'msg6', text: 'Thanks, Alice! I really appreciate that. I was going for a clean, minimalist look.', timestamp: 'Yesterday', senderId: 'user3' },
  ],
  user4: [
    { id: 'msg7', text: 'Hi Alice, I read your article on state management. Great insights!', timestamp: 'Monday', senderId: 'user4' },
  ]
};
