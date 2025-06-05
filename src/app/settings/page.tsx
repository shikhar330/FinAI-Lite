
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SettingsIcon as SettingsLUCIcon, Moon, Sun, Bell, Mail } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from 'next-themes';

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Notification states (UI only for now)
  const [emailBillReminders, setEmailBillReminders] = useState(true);
  const [goalMilestoneAlerts, setGoalMilestoneAlerts] = useState(true);
  const [weeklySummaryEmail, setWeeklySummaryEmail] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordReset = async () => {
    if (user && user.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
          title: "Password Reset Email Sent",
          description: "Check your inbox for a link to reset your password.",
        });
      } catch (error: any) {
        toast({
          title: "Error Sending Reset Email",
          description: error.message || "Could not send password reset email. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "No email address found for this user to send a reset link.",
        variant: "destructive",
      });
    }
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch during initial render for theme
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Application Settings"
        description="Configure your application preferences and account settings."
        icon={SettingsLUCIcon}
      />
      <div className="container mx-auto max-w-2xl space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>Manage your account details and security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Change Password</h4>
              <p className="text-sm text-muted-foreground">
                To change your password, we'll send a reset link to your registered email address.
              </p>
              <Button onClick={handlePasswordReset} variant="outline">
                Send Password Reset Email
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                {currentTheme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                <Label htmlFor="theme-toggle" className="text-sm">
                  {currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={currentTheme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label="Toggle theme"
              />
            </div>
             <p className="text-xs text-muted-foreground">
              You can also set your theme to follow your system preference. Currently, the effective theme is {currentTheme}.
              System preference is handled automatically if you haven't explicitly set Light or Dark mode.
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage how you receive updates and alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <Label htmlFor="email-bill-reminders" className="text-sm font-normal">
                  Email Bill Reminders
                </Label>
              </div>
              <Switch
                id="email-bill-reminders"
                checked={emailBillReminders}
                onCheckedChange={setEmailBillReminders}
                aria-label="Toggle email bill reminders"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary" />
                <Label htmlFor="goal-milestone-alerts" className="text-sm font-normal">
                  Goal Milestone Alerts (App/Push)
                </Label>
              </div>
              <Switch
                id="goal-milestone-alerts"
                checked={goalMilestoneAlerts}
                onCheckedChange={setGoalMilestoneAlerts}
                aria-label="Toggle goal milestone alerts"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <Label htmlFor="weekly-summary-email" className="text-sm font-normal">
                  Weekly Financial Summary Email
                </Label>
              </div>
              <Switch
                id="weekly-summary-email"
                checked={weeklySummaryEmail}
                onCheckedChange={setWeeklySummaryEmail}
                aria-label="Toggle weekly financial summary email"
              />
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Note: These notification settings are currently for UI demonstration and do not trigger actual notifications.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default withAuth(SettingsPage);
