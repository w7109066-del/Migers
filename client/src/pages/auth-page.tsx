import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Eye, EyeOff, User, Mail, Globe, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: "",
      gender: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    }, {
      onSuccess: () => {
        // User will be redirected automatically via the redirect check above
      }
    });
  };

  const onRegister = (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData, {
      onSuccess: () => {
        // User will be redirected automatically via the redirect check above
      }
    });
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <MessageCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ChatMe Chatroom</h1>
          <p className="text-purple-100">Connect with friends worldwide</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-gray-800">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <div className="relative">
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter your username"
                        className="pl-10"
                        {...loginForm.register("username")}
                      />
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-600">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pr-10"
                        {...loginForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <div className="relative">
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="4-12 characters: lowercase, numbers, dots"
                        className="pl-10"
                        {...registerForm.register("username")}
                        onChange={(e) => {
                          // Auto-convert to lowercase and filter invalid characters
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, '');
                          e.target.value = value;
                          registerForm.setValue("username", value);
                        }}
                        maxLength={12}
                      />
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-500">
                      4-12 characters, lowercase letters, numbers, and dots only
                    </div>
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-600">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        {...registerForm.register("email")}
                      />
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pr-10"
                        {...registerForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pr-10"
                        {...registerForm.register("confirmPassword")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-country">Country</Label>
                      <Select onValueChange={(value) => registerForm.setValue("country", value)}>
                        <SelectTrigger className="w-full">
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 text-gray-400 mr-2" />
                            <SelectValue placeholder="Select" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="ID">Indonesia</SelectItem>
                          <SelectItem value="SG">Singapore</SelectItem>
                          <SelectItem value="MY">Malaysia</SelectItem>
                          <SelectItem value="PH">Philippines</SelectItem>
                          <SelectItem value="TH">Thailand</SelectItem>
                          <SelectItem value="VN">Vietnam</SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.country && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.country.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-gender">Gender</Label>
                      <Select onValueChange={(value) => registerForm.setValue("gender", value)}>
                        <SelectTrigger className="w-full">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            <SelectValue placeholder="Select" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.gender && (
                        <p className="text-sm text-red-600">{registerForm.formState.errors.gender.message}</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
