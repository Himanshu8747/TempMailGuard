import { useState, useEffect, useRef, RefObject } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { VerificationResult } from '@/types';
import { useDebounce } from './use-debounce';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface UseEmailValidatorProps {
  inputRef: RefObject<HTMLInputElement>;
  debounceTime?: number;
  position?: TooltipPosition;
}

interface UseEmailValidatorResult {
  isValidating: boolean;
  validationResult: VerificationResult | null;
  validationError: string | null;
  tooltipRef: RefObject<HTMLDivElement>;
  showTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
}

// We're using the imported useDebounce hook

export function useEmailValidator({
  inputRef,
  debounceTime = 500,
  position = 'bottom'
}: UseEmailValidatorProps): UseEmailValidatorResult {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<VerificationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Debounce email input to prevent excessive API calls
  const debouncedEmail = useDebounce(email, debounceTime);
  
  // Set up event listeners for the input element
  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;
    
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      setEmail(target.value);
      
      // Show tooltip when user starts typing
      if (target.value && !showTooltip) {
        setShowTooltip(true);
      }
    };
    
    const handleFocus = () => {
      if (email) {
        setShowTooltip(true);
      }
    };
    
    const handleBlur = (e: FocusEvent) => {
      // Don't hide tooltip if clicking inside the tooltip
      const tooltipElement = tooltipRef.current;
      const relatedTarget = e.relatedTarget as Node;
      
      if (tooltipElement && relatedTarget && tooltipElement.contains(relatedTarget)) {
        return;
      }
      
      // Hide tooltip on blur
      setShowTooltip(false);
    };
    
    // Add event listeners
    inputElement.addEventListener('input', handleInput);
    inputElement.addEventListener('focus', handleFocus);
    inputElement.addEventListener('blur', handleBlur);
    
    // Clean up event listeners
    return () => {
      inputElement.removeEventListener('input', handleInput);
      inputElement.removeEventListener('focus', handleFocus);
      inputElement.removeEventListener('blur', handleBlur);
    };
  }, [inputRef, showTooltip, email]);
  
  // Validate email when debounced email changes
  useEffect(() => {
    async function validateEmail() {
      if (!debouncedEmail || !debouncedEmail.includes('@')) {
        setValidationResult(null);
        setValidationError(null);
        return;
      }
      
      setIsValidating(true);
      setValidationError(null);
      
      try {
        const response = await apiRequest(`/api/verify?email=${encodeURIComponent(debouncedEmail)}`);
        const result = await response.json();
        setValidationResult(result);
        
        // Invalidate dashboard stats and recent verifications to keep them in sync
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recent-verifications'] });
      } catch (error) {
        console.error('Email validation error:', error);
        setValidationError(error instanceof Error ? error.message : 'Failed to validate email');
      } finally {
        setIsValidating(false);
      }
    }
    
    validateEmail();
  }, [debouncedEmail]);
  
  // Position tooltip based on input element
  useEffect(() => {
    const inputElement = inputRef.current;
    const tooltipElement = tooltipRef.current;
    
    if (!inputElement || !tooltipElement || !showTooltip) return;
    
    const inputRect = inputElement.getBoundingClientRect();
    
    // Apply inline styles via a callback ref
    // because Typescript with forwardRef is a bit tricky
    if (position === 'bottom') {
      tooltipElement.style.top = `${inputElement.offsetHeight + 5}px`;
      tooltipElement.style.left = '0';
    } else if (position === 'top') {
      tooltipElement.style.bottom = `${inputElement.offsetHeight + 5}px`;
      tooltipElement.style.left = '0';
    } else if (position === 'left') {
      tooltipElement.style.right = `${inputElement.offsetWidth + 5}px`;
      tooltipElement.style.top = '0';
    } else if (position === 'right') {
      tooltipElement.style.left = `${inputElement.offsetWidth + 5}px`;
      tooltipElement.style.top = '0';
    }
  }, [showTooltip, position, inputRef]);
  
  return {
    isValidating,
    validationResult,
    validationError,
    tooltipRef,
    showTooltip,
    setShowTooltip
  };
}