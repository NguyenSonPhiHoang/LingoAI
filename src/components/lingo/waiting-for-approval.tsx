"use client";

import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';

const WaitingForApproval: FC = () => {
  const { logout } = useAuth();
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              <Clock className="h-12 w-12 text-primary" />
           </div>
          <CardTitle className="mt-4 text-2xl">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account has been created successfully, but you'll need to wait for an administrator to approve it before you can access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-muted-foreground">You will be notified via email once your account is approved. If you have any questions, please contact support.</p>
            <Button onClick={logout} variant="outline" className="mt-6">
                Log Out
            </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitingForApproval;
