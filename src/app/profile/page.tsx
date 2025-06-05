
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { UserCircle, Mail, ShieldCheck } from 'lucide-react';
import withAuth from '@/components/auth/withAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
        description: "No email address found for this user.",
        variant: "destructive",
      });
    }
  };


  if (!user) {
    // This should ideally be handled by withAuth, but as a fallback:
    return (
      <div className="space-y-8">
        <PageHeader 
          title="My Profile"
          description="View and manage your profile information."
          icon={UserCircle}
        />
        <p className="text-center text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="My Profile"
        description="View and manage your profile information."
        icon={UserCircle}
      />
      <div className="container mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Welcome, {user.displayName || user.email?.split('@')[0] || 'User'}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Account Status</p>
                <p className="font-medium">{user.emailVerified ? "Verified" : "Not Verified"}</p>
              </div>
            </div>
            
            {/* Placeholder for more profile info - Display Name, Photo URL etc. */}
            {/* Example:
            {user.displayName && (
              <div className="flex items-center space-x-3">
                <p className="text-sm text-muted-foreground">Display Name:</p>
                <p>{user.displayName}</p>
              </div>
            )}
            */}

            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-2">Account Actions</h3>
               <Button onClick={handlePasswordReset} variant="outline">
                Send Password Reset Email
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                If you wish to change your password, click the button above. An email will be sent to your registered address with instructions.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(ProfilePage);
