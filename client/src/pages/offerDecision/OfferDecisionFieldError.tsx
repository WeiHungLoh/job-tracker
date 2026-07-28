type OfferDecisionFieldErrorProps = {
    className: string;
    id: string;
    message?: string;
};

export const getOfferDecisionErrorProps = (id: string, message?: string) => ({
    'aria-describedby': message ? id : undefined,
    'aria-invalid': Boolean(message),
});

const OfferDecisionFieldError = ({ className, id, message }: OfferDecisionFieldErrorProps) =>
    message ? (
        <span className={className} id={id}>
            {message}
        </span>
    ) : null;

export default OfferDecisionFieldError;
