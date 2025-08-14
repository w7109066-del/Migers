import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    rememberMe: false
  });
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    gender: ""
  });

  // Toggle states for optional fields
  const [showCountryField, setShowCountryField] = useState(false);
  const [showGenderField, setShowGenderField] = useState(false);

  // If user is already authenticated, redirect to app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await login(loginForm.username, loginForm.password);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive"
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    try {
      // TODO: Implement forgot password API call
      toast({
        title: "Password Reset Sent",
        description: "Check your email for password reset instructions",
        variant: "default"
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (registerForm.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      await register(
        registerForm.username,
        registerForm.email,
        registerForm.password,
        showCountryField ? registerForm.country : "",
        showGenderField ? registerForm.gender : ""
      );
    } catch (error) {
      console.error("Register error:", error);
      toast({
        title: "Registration Failed",
        description: "Username or email already exists",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-auth-image">
      {/* Background image overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-700 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-ping animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md backdrop-blur-md bg-white/15 border border-white/30 shadow-2xl animate-fade-in-up relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white animate-fade-in">Welcome to ChatMe</CardTitle>
          <CardDescription className="text-gray-200 animate-fade-in animation-delay-200">
            Connect with friends and join conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="animate-fade-in animation-delay-400">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border border-white/20">
              <TabsTrigger value="login" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white transition-all duration-300">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white transition-all duration-300">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-white">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    disabled={isLoading}
                    required
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      disabled={isLoading}
                      required
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={loginForm.rememberMe}
                      onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                      className="w-4 h-4 text-orange-500 bg-white/10 border-white/20 rounded focus:ring-orange-400 focus:ring-2"
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-white cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-orange-300 hover:text-orange-200 hover:bg-white/10 p-0"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
                
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white border-none shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="animate-fade-in">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-white">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Choose a username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    disabled={isLoading}
                    required
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-white">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    disabled={isLoading}
                    required
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-white">Password</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Choose a password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      disabled={isLoading}
                      required
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      required
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Country Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-country" className="text-white">Add Country</Label>
                    <Switch
                      id="show-country"
                      checked={showCountryField}
                      onCheckedChange={setShowCountryField}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  {showCountryField && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="register-country" className="text-white">Country</Label>
                      <Select
                        value={registerForm.country}
                        onValueChange={(value) => setRegisterForm({ ...registerForm, country: value })}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white focus:border-orange-400 focus:ring-orange-400/20">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="afghanistan">Afghanistan</SelectItem>
                          <SelectItem value="albania">Albania</SelectItem>
                          <SelectItem value="algeria">Algeria</SelectItem>
                          <SelectItem value="andorra">Andorra</SelectItem>
                          <SelectItem value="angola">Angola</SelectItem>
                          <SelectItem value="antigua-and-barbuda">Antigua and Barbuda</SelectItem>
                          <SelectItem value="argentina">Argentina</SelectItem>
                          <SelectItem value="armenia">Armenia</SelectItem>
                          <SelectItem value="australia">Australia</SelectItem>
                          <SelectItem value="austria">Austria</SelectItem>
                          <SelectItem value="azerbaijan">Azerbaijan</SelectItem>
                          <SelectItem value="bahamas">Bahamas</SelectItem>
                          <SelectItem value="bahrain">Bahrain</SelectItem>
                          <SelectItem value="bangladesh">Bangladesh</SelectItem>
                          <SelectItem value="barbados">Barbados</SelectItem>
                          <SelectItem value="belarus">Belarus</SelectItem>
                          <SelectItem value="belgium">Belgium</SelectItem>
                          <SelectItem value="belize">Belize</SelectItem>
                          <SelectItem value="benin">Benin</SelectItem>
                          <SelectItem value="bhutan">Bhutan</SelectItem>
                          <SelectItem value="bolivia">Bolivia</SelectItem>
                          <SelectItem value="bosnia-and-herzegovina">Bosnia and Herzegovina</SelectItem>
                          <SelectItem value="botswana">Botswana</SelectItem>
                          <SelectItem value="brazil">Brazil</SelectItem>
                          <SelectItem value="brunei">Brunei</SelectItem>
                          <SelectItem value="bulgaria">Bulgaria</SelectItem>
                          <SelectItem value="burkina-faso">Burkina Faso</SelectItem>
                          <SelectItem value="burundi">Burundi</SelectItem>
                          <SelectItem value="cabo-verde">Cabo Verde</SelectItem>
                          <SelectItem value="cambodia">Cambodia</SelectItem>
                          <SelectItem value="cameroon">Cameroon</SelectItem>
                          <SelectItem value="canada">Canada</SelectItem>
                          <SelectItem value="central-african-republic">Central African Republic</SelectItem>
                          <SelectItem value="chad">Chad</SelectItem>
                          <SelectItem value="chile">Chile</SelectItem>
                          <SelectItem value="china">China</SelectItem>
                          <SelectItem value="colombia">Colombia</SelectItem>
                          <SelectItem value="comoros">Comoros</SelectItem>
                          <SelectItem value="congo-democratic-republic">Congo (Democratic Republic)</SelectItem>
                          <SelectItem value="congo-republic">Congo (Republic)</SelectItem>
                          <SelectItem value="costa-rica">Costa Rica</SelectItem>
                          <SelectItem value="croatia">Croatia</SelectItem>
                          <SelectItem value="cuba">Cuba</SelectItem>
                          <SelectItem value="cyprus">Cyprus</SelectItem>
                          <SelectItem value="czech-republic">Czech Republic</SelectItem>
                          <SelectItem value="denmark">Denmark</SelectItem>
                          <SelectItem value="djibouti">Djibouti</SelectItem>
                          <SelectItem value="dominica">Dominica</SelectItem>
                          <SelectItem value="dominican-republic">Dominican Republic</SelectItem>
                          <SelectItem value="ecuador">Ecuador</SelectItem>
                          <SelectItem value="egypt">Egypt</SelectItem>
                          <SelectItem value="el-salvador">El Salvador</SelectItem>
                          <SelectItem value="equatorial-guinea">Equatorial Guinea</SelectItem>
                          <SelectItem value="eritrea">Eritrea</SelectItem>
                          <SelectItem value="estonia">Estonia</SelectItem>
                          <SelectItem value="eswatini">Eswatini</SelectItem>
                          <SelectItem value="ethiopia">Ethiopia</SelectItem>
                          <SelectItem value="fiji">Fiji</SelectItem>
                          <SelectItem value="finland">Finland</SelectItem>
                          <SelectItem value="france">France</SelectItem>
                          <SelectItem value="gabon">Gabon</SelectItem>
                          <SelectItem value="gambia">Gambia</SelectItem>
                          <SelectItem value="georgia">Georgia</SelectItem>
                          <SelectItem value="germany">Germany</SelectItem>
                          <SelectItem value="ghana">Ghana</SelectItem>
                          <SelectItem value="greece">Greece</SelectItem>
                          <SelectItem value="grenada">Grenada</SelectItem>
                          <SelectItem value="guatemala">Guatemala</SelectItem>
                          <SelectItem value="guinea">Guinea</SelectItem>
                          <SelectItem value="guinea-bissau">Guinea-Bissau</SelectItem>
                          <SelectItem value="guyana">Guyana</SelectItem>
                          <SelectItem value="haiti">Haiti</SelectItem>
                          <SelectItem value="honduras">Honduras</SelectItem>
                          <SelectItem value="hungary">Hungary</SelectItem>
                          <SelectItem value="iceland">Iceland</SelectItem>
                          <SelectItem value="india">India</SelectItem>
                          <SelectItem value="indonesia">Indonesia</SelectItem>
                          <SelectItem value="iran">Iran</SelectItem>
                          <SelectItem value="iraq">Iraq</SelectItem>
                          <SelectItem value="ireland">Ireland</SelectItem>
                          <SelectItem value="israel">Israel</SelectItem>
                          <SelectItem value="italy">Italy</SelectItem>
                          <SelectItem value="ivory-coast">Ivory Coast</SelectItem>
                          <SelectItem value="jamaica">Jamaica</SelectItem>
                          <SelectItem value="japan">Japan</SelectItem>
                          <SelectItem value="jordan">Jordan</SelectItem>
                          <SelectItem value="kazakhstan">Kazakhstan</SelectItem>
                          <SelectItem value="kenya">Kenya</SelectItem>
                          <SelectItem value="kiribati">Kiribati</SelectItem>
                          <SelectItem value="korea-north">Korea (North)</SelectItem>
                          <SelectItem value="korea-south">Korea (South)</SelectItem>
                          <SelectItem value="kuwait">Kuwait</SelectItem>
                          <SelectItem value="kyrgyzstan">Kyrgyzstan</SelectItem>
                          <SelectItem value="laos">Laos</SelectItem>
                          <SelectItem value="latvia">Latvia</SelectItem>
                          <SelectItem value="lebanon">Lebanon</SelectItem>
                          <SelectItem value="lesotho">Lesotho</SelectItem>
                          <SelectItem value="liberia">Liberia</SelectItem>
                          <SelectItem value="libya">Libya</SelectItem>
                          <SelectItem value="liechtenstein">Liechtenstein</SelectItem>
                          <SelectItem value="lithuania">Lithuania</SelectItem>
                          <SelectItem value="luxembourg">Luxembourg</SelectItem>
                          <SelectItem value="madagascar">Madagascar</SelectItem>
                          <SelectItem value="malawi">Malawi</SelectItem>
                          <SelectItem value="malaysia">Malaysia</SelectItem>
                          <SelectItem value="maldives">Maldives</SelectItem>
                          <SelectItem value="mali">Mali</SelectItem>
                          <SelectItem value="malta">Malta</SelectItem>
                          <SelectItem value="marshall-islands">Marshall Islands</SelectItem>
                          <SelectItem value="mauritania">Mauritania</SelectItem>
                          <SelectItem value="mauritius">Mauritius</SelectItem>
                          <SelectItem value="mexico">Mexico</SelectItem>
                          <SelectItem value="micronesia">Micronesia</SelectItem>
                          <SelectItem value="moldova">Moldova</SelectItem>
                          <SelectItem value="monaco">Monaco</SelectItem>
                          <SelectItem value="mongolia">Mongolia</SelectItem>
                          <SelectItem value="montenegro">Montenegro</SelectItem>
                          <SelectItem value="morocco">Morocco</SelectItem>
                          <SelectItem value="mozambique">Mozambique</SelectItem>
                          <SelectItem value="myanmar">Myanmar</SelectItem>
                          <SelectItem value="namibia">Namibia</SelectItem>
                          <SelectItem value="nauru">Nauru</SelectItem>
                          <SelectItem value="nepal">Nepal</SelectItem>
                          <SelectItem value="netherlands">Netherlands</SelectItem>
                          <SelectItem value="new-zealand">New Zealand</SelectItem>
                          <SelectItem value="nicaragua">Nicaragua</SelectItem>
                          <SelectItem value="niger">Niger</SelectItem>
                          <SelectItem value="nigeria">Nigeria</SelectItem>
                          <SelectItem value="north-macedonia">North Macedonia</SelectItem>
                          <SelectItem value="norway">Norway</SelectItem>
                          <SelectItem value="oman">Oman</SelectItem>
                          <SelectItem value="pakistan">Pakistan</SelectItem>
                          <SelectItem value="palau">Palau</SelectItem>
                          <SelectItem value="palestine">Palestine</SelectItem>
                          <SelectItem value="panama">Panama</SelectItem>
                          <SelectItem value="papua-new-guinea">Papua New Guinea</SelectItem>
                          <SelectItem value="paraguay">Paraguay</SelectItem>
                          <SelectItem value="peru">Peru</SelectItem>
                          <SelectItem value="philippines">Philippines</SelectItem>
                          <SelectItem value="poland">Poland</SelectItem>
                          <SelectItem value="portugal">Portugal</SelectItem>
                          <SelectItem value="qatar">Qatar</SelectItem>
                          <SelectItem value="romania">Romania</SelectItem>
                          <SelectItem value="russia">Russia</SelectItem>
                          <SelectItem value="rwanda">Rwanda</SelectItem>
                          <SelectItem value="saint-kitts-and-nevis">Saint Kitts and Nevis</SelectItem>
                          <SelectItem value="saint-lucia">Saint Lucia</SelectItem>
                          <SelectItem value="saint-vincent-and-the-grenadines">Saint Vincent and the Grenadines</SelectItem>
                          <SelectItem value="samoa">Samoa</SelectItem>
                          <SelectItem value="san-marino">San Marino</SelectItem>
                          <SelectItem value="sao-tome-and-principe">Sao Tome and Principe</SelectItem>
                          <SelectItem value="saudi-arabia">Saudi Arabia</SelectItem>
                          <SelectItem value="senegal">Senegal</SelectItem>
                          <SelectItem value="serbia">Serbia</SelectItem>
                          <SelectItem value="seychelles">Seychelles</SelectItem>
                          <SelectItem value="sierra-leone">Sierra Leone</SelectItem>
                          <SelectItem value="singapore">Singapore</SelectItem>
                          <SelectItem value="slovakia">Slovakia</SelectItem>
                          <SelectItem value="slovenia">Slovenia</SelectItem>
                          <SelectItem value="solomon-islands">Solomon Islands</SelectItem>
                          <SelectItem value="somalia">Somalia</SelectItem>
                          <SelectItem value="south-africa">South Africa</SelectItem>
                          <SelectItem value="south-sudan">South Sudan</SelectItem>
                          <SelectItem value="spain">Spain</SelectItem>
                          <SelectItem value="sri-lanka">Sri Lanka</SelectItem>
                          <SelectItem value="sudan">Sudan</SelectItem>
                          <SelectItem value="suriname">Suriname</SelectItem>
                          <SelectItem value="sweden">Sweden</SelectItem>
                          <SelectItem value="switzerland">Switzerland</SelectItem>
                          <SelectItem value="syria">Syria</SelectItem>
                          <SelectItem value="taiwan">Taiwan</SelectItem>
                          <SelectItem value="tajikistan">Tajikistan</SelectItem>
                          <SelectItem value="tanzania">Tanzania</SelectItem>
                          <SelectItem value="thailand">Thailand</SelectItem>
                          <SelectItem value="timor-leste">Timor-Leste</SelectItem>
                          <SelectItem value="togo">Togo</SelectItem>
                          <SelectItem value="tonga">Tonga</SelectItem>
                          <SelectItem value="trinidad-and-tobago">Trinidad and Tobago</SelectItem>
                          <SelectItem value="tunisia">Tunisia</SelectItem>
                          <SelectItem value="turkey">Turkey</SelectItem>
                          <SelectItem value="turkmenistan">Turkmenistan</SelectItem>
                          <SelectItem value="tuvalu">Tuvalu</SelectItem>
                          <SelectItem value="uganda">Uganda</SelectItem>
                          <SelectItem value="ukraine">Ukraine</SelectItem>
                          <SelectItem value="united-arab-emirates">United Arab Emirates</SelectItem>
                          <SelectItem value="united-kingdom">United Kingdom</SelectItem>
                          <SelectItem value="united-states">United States</SelectItem>
                          <SelectItem value="uruguay">Uruguay</SelectItem>
                          <SelectItem value="uzbekistan">Uzbekistan</SelectItem>
                          <SelectItem value="vanuatu">Vanuatu</SelectItem>
                          <SelectItem value="vatican-city">Vatican City</SelectItem>
                          <SelectItem value="venezuela">Venezuela</SelectItem>
                          <SelectItem value="vietnam">Vietnam</SelectItem>
                          <SelectItem value="yemen">Yemen</SelectItem>
                          <SelectItem value="zambia">Zambia</SelectItem>
                          <SelectItem value="zimbabwe">Zimbabwe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Gender Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-gender" className="text-white">Add Gender</Label>
                    <Switch
                      id="show-gender"
                      checked={showGenderField}
                      onCheckedChange={setShowGenderField}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  {showGenderField && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="register-gender" className="text-white">Gender</Label>
                      <Select
                        value={registerForm.gender}
                        onValueChange={(value) => setRegisterForm({ ...registerForm, gender: value })}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white focus:border-orange-400 focus:ring-orange-400/20">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white border-none shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md backdrop-blur-md bg-white/15 border border-white/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white text-center">Forgot Password</CardTitle>
              <CardDescription className="text-gray-200 text-center">
                Enter your email to receive password reset instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-white">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail("");
                    }}
                    className="flex-1 text-white border border-white/20 hover:bg-white/10 transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white border-none shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    Send Reset Link
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}