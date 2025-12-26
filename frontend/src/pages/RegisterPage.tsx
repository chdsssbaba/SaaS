import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, User, Lock, Building2, Mail, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    tenantName: '',
    subdomain: '',
    adminEmail: '',
    adminFullName: '',
    adminPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.tenantName || !formData.subdomain || !formData.adminEmail || 
        !formData.adminFullName || !formData.adminPassword || !formData.confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.adminPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        tenantName: formData.tenantName,
        subdomain: formData.subdomain.toLowerCase().replace(/\s+/g, '-'),
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFullName: formData.adminFullName,
      });
      navigate('/login');
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="glass-card p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Create Organization</h1>
          <p className="text-muted-foreground">
            Register your organization and start managing projects
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="tenantName"
              placeholder="Organization Name"
              value={formData.tenantName}
              onChange={handleChange}
              className="glass-input pl-12"
              disabled={isLoading}
            />
          </div>

          {/* Subdomain */}
          <div className="space-y-1">
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                name="subdomain"
                placeholder="Subdomain"
                value={formData.subdomain}
                onChange={handleChange}
                className="glass-input pl-12"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground pl-1">
              Your organization URL: <span className="text-primary">{formData.subdomain || 'subdomain'}</span>.yourapp.com
            </p>
          </div>

          {/* Admin Full Name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              name="adminFullName"
              placeholder="Your Full Name"
              value={formData.adminFullName}
              onChange={handleChange}
              className="glass-input pl-12"
              disabled={isLoading}
            />
          </div>

          {/* Admin Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              name="adminEmail"
              placeholder="Email Address"
              value={formData.adminEmail}
              onChange={handleChange}
              className="glass-input pl-12"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="adminPassword"
              placeholder="Password (min 8 characters)"
              value={formData.adminPassword}
              onChange={handleChange}
              className="glass-input pl-12 pr-12"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="glass-input pl-12 pr-12"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Password match indicator */}
          {formData.confirmPassword && (
            <div className="flex items-center gap-2 text-sm">
              {formData.adminPassword === formData.confirmPassword ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Passwords match</span>
                </>
              ) : (
                <>
                  <span className="text-destructive">Passwords don't match</span>
                </>
              )}
            </div>
          )}

          {/* Terms */}
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
            >
              I agree to the{' '}
              <span className="text-primary hover:underline cursor-pointer">Terms & Conditions</span>{' '}
              and{' '}
              <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
            </label>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 gradient-button text-primary-foreground mt-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Organization...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </form>

        {/* Login link */}
        <div className="text-center pt-4 border-t border-border/30">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
