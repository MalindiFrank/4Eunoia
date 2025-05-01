import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('should override conflicting Tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle various input types', () => {
    expect(cn('class1', undefined, null, false, { class2: true, class3: false }, ['class4', 'class5']))
      .toBe('class1 class2 class4 class5');
  });

   it('should return empty string for no input', () => {
     expect(cn()).toBe('');
   });
});
