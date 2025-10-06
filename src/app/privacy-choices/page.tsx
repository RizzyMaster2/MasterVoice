
'use client';

import { useState, useEffect, useTransition } from 'react';
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { ToggleRight, BrainCircuit, Search, Save, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { updatePrivacySettings } from '@/app/(auth)/actions/user';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

type PrivacySettings = {
  allow_ai_suggestions: boolean;
  searchable_by_email: boolean;
};

function PrivacyChoiceItem({
  icon,
  title,
  description,
  id,
  checked,
  onCheckedChange,
  disabled
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="flex items-start space-x-4">
        <div className="mt-1 text-primary">{icon}</div>
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-base font-semibold">
            {title}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export default function PrivacyChoicesPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [settings, setSettings] = useState<PrivacySettings>({
    allow_ai_suggestions: true,
    searchable_by_email: true,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.user_metadata.privacy_settings) {
      const userSettings = user.user_metadata.privacy_settings;
      setSettings({
        allow_ai_suggestions: userSettings.allow_ai_suggestions ?? true,
        searchable_by_email: userSettings.searchable_by_email ?? true,
      });
    }
  }, [user]);

  const handleSettingChange = (key: keyof PrivacySettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };
  
  const handleSaveChanges = async () => {
    startTransition(async () => {
        try {
            await updatePrivacySettings(settings);
            toast({
                title: 'Settings Saved',
                description: 'Your privacy settings have been updated.',
                variant: 'success',
            });
            setIsDirty(false);
        } catch (error) {
             toast({
                title: 'Error Saving Settings',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    })
  }
  
  const isLoading = isUserLoading || !user;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader user={user} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <ToggleRight className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Your Privacy Choices</CardTitle>
              <CardDescription>Manage how your information is used on MasterVoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <PrivacyChoiceItem
                            id="ai-suggestions"
                            icon={<BrainCircuit className="h-6 w-6" />}
                            title="AI Connection Suggestions"
                            description="Allow us to use your activity to suggest new friends and connections."
                            checked={settings.allow_ai_suggestions}
                            onCheckedChange={(value) => handleSettingChange('allow_ai_suggestions', value)}
                            disabled={isSubmitting}
                        />
                         <PrivacyChoiceItem
                            id="profile-search"
                            icon={<Search className="h-6 w-6" />}
                            title="Profile Visibility"
                            description="Allow other users to find you by searching for your email address."
                            checked={settings.searchable_by_email}
                            onCheckedChange={(value) => handleSettingChange('searchable_by_email', value)}
                            disabled={isSubmitting}
                        />
                    </div>
                )}
            </CardContent>
             <CardContent className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={!isDirty || isSubmitting}>
                   {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </>
                )}
                </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
