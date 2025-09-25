import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export function UnverifiedAccountWarning() {
  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-4 flex items-center gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div className="text-amber-800">
          <h3 className="font-bold">Your account is not verified.</h3>
          <p className="text-sm">
            Please check your email to verify your account. Some features, like sending friend requests, are disabled until you verify.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
