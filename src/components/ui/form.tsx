
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
// Slot is no longer used directly by FormControl in this alternative
// import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  // The ref type now depends on the child, could be HTMLElement or a component instance.
  // For simplicity, let's use HTMLElement as common DOM elements are expected.
  HTMLElement,
  // We expect 'children' to be a single React.ReactElement.
  // Other props like className are passed through.
  React.HTMLAttributes<HTMLElement> & { children: React.ReactElement }
>(({ children, ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  // `React.Children.only` will throw if `children` is not a single, valid React element.
  // This is similar to what Slot does internally.
  const child = React.Children.only(children) as React.ReactElement;

  // The `ref` passed to FormControl (from `React.forwardRef`) is not typically what
  // react-hook-form's Controller needs for the actual input. `field.ref` from
  // Controller is usually spread directly onto the input component (e.g., <Input {...field} />).
  // `React.cloneElement` will preserve the `ref` that is already on the `child` if `field.ref` was spread.
  // So, we don't explicitly pass the `ref` from `FormControl`'s `forwardRef` here.
  
  // Props to add or override on the child.
  const controlProps: React.HTMLAttributes<HTMLElement> & { [key: string]: any } = {
    id: formItemId,
    'aria-describedby': !error
      ? formDescriptionId
      : `${formDescriptionId} ${formMessageId}`,
    'aria-invalid': !!error,
  };

  // Merge props: `props` passed to FormControl (e.g., className), then our controlProps,
  // then the child's original props. cloneElement handles merging.
  return React.cloneElement(child, {
    ...props,       // Props passed to <FormControl> (e.g., className)
    ...controlProps // Our generated ARIA props and id
    // Child's original props (including field props from react-hook-form) are preserved by cloneElement
    // and new props take precedence if there are conflicts.
  });
});
FormControl.displayName = "FormControl";


const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
