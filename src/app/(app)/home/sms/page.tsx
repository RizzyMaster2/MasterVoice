'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, MessageSquare, Plus, User, Send, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type Contact = {
  id: string;
  name: string;
  phone: string;
};

type Message = {
  id: string;
  contactId: string;
  content: string;
  type: 'sent' | 'received';
  timestamp: string;
};

const MOCK_CONTACTS_KEY = 'sms-contacts';
const MOCK_MESSAGES_KEY = 'sms-messages';
const VIRTUAL_NUMBER_KEY = 'virtual-phone-number';

// Helper to get from localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return defaultValue;
  }
}

// Helper to set to localStorage
function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
}

// Generate a random US-style phone number
function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const firstPart = Math.floor(Math.random() * 900) + 100;
  const secondPart = Math.floor(Math.random() * 9000) + 1000;
  return `+1 (${areaCode}) ${firstPart}-${secondPart}`;
}


export default function SmsPage() {
  const { toast } = useToast();
  const [virtualNumber, setVirtualNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  useEffect(() => {
    // Load data from localStorage on mount
    const storedContacts = getFromStorage<Contact[]>(MOCK_CONTACTS_KEY, []);
    const storedMessages = getFromStorage<Message[]>(MOCK_MESSAGES_KEY, []);
    let storedNumber = getFromStorage<string>(VIRTUAL_NUMBER_KEY, '');

    if (!storedNumber) {
        storedNumber = generatePhoneNumber();
        saveToStorage(VIRTUAL_NUMBER_KEY, storedNumber);
    }
    
    setVirtualNumber(storedNumber);
    setContacts(storedContacts);
    setMessages(storedMessages);
    
    if (storedContacts.length > 0) {
        setSelectedContact(storedContacts[0]);
    }

  }, []);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast({ title: "Please fill both name and phone number.", variant: "destructive" });
      return;
    }
    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name: newContactName,
      phone: newContactPhone,
    };
    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    saveToStorage(MOCK_CONTACTS_KEY, updatedContacts);
    setNewContactName('');
    setNewContactPhone('');
    toast({ title: "Contact added successfully!", variant: "success" });
  };
  
  const handleDeleteContact = (contactId: string) => {
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    setContacts(updatedContacts);
    saveToStorage(MOCK_CONTACTS_KEY, updatedContacts);

    if (selectedContact?.id === contactId) {
        setSelectedContact(updatedContacts.length > 0 ? updatedContacts[0] : null);
    }
     toast({ title: "Contact deleted.", variant: "destructive" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      contactId: selectedContact.id,
      content: newMessage,
      type: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    saveToStorage(MOCK_MESSAGES_KEY, updatedMessages);
    setNewMessage('');
  };
  
  const filteredMessages = messages.filter(
    (msg) => msg.contactId === selectedContact?.id
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column: Virtual Number and Contacts */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Phone className="h-5 w-5 text-primary" />
              Your Virtual Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono text-center bg-muted p-4 rounded-lg">
                {virtualNumber || 'Generating...'}
            </p>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <User className="h-5 w-5 text-primary" />
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
             <form onSubmit={handleAddContact} className="space-y-2">
                <Input placeholder="Contact Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} />
                <Input placeholder="Phone Number" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} />
                <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
            </form>
            <ScrollArea className="flex-1">
                <div className="space-y-2">
                    {contacts.map(contact => (
                        <div key={contact.id} 
                             className={cn(
                                "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent/50",
                                selectedContact?.id === contact.id && 'bg-accent'
                             )}
                             onClick={() => setSelectedContact(contact)}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{contact.name}</p>
                                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                </div>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {contact.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the contact.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteContact(contact.id)} className="bg-destructive hover:bg-destructive/90">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Chat Interface */}
      <Card className="lg:col-span-2 flex flex-col h-full">
        {selectedContact ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="font-headline">Conversation with {selectedContact.name}</CardTitle>
              <CardDescription>{selectedContact.phone}</CardDescription>
            </CardHeader>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {filteredMessages.map(msg => (
                  <div key={msg.id} className={cn("flex items-end gap-2", msg.type === 'sent' && 'justify-end')}>
                    {msg.type === 'received' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{selectedContact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn(
                        "max-w-xs rounded-lg p-3 text-sm md:max-w-md",
                        msg.type === 'sent' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <CardContent className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Select a Contact</h3>
            <p className="text-muted-foreground">Choose a contact from the list to start messaging.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
