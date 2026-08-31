import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../../components/authLayout/AuthLayout';
import AuthRequestInfo from '../../../components/authRequestInfo/AuthRequestInfo';
import Icon from '../../../components/icon/Icon';
import BrandMark from '../../../components/brandMark/BrandMark';
import PrimaryButton from '../../../components/button/PrimaryButton';
import type { SubmitEvent } from 'react';
import { routes } from '../../../routes';
import styles from '../Authentication.module.css';
import { useJobTrackerAPI } from '../../../api/useJobTrackerAPI';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../components/toast/ToastProvider';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import {
    EMAIL_MAX_LENGTH,
    getPasswordValidationError,
    normalizeEmail,
    PASSWORD_MAX_BYTES,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from '../../../helper/formValidation';
import PasswordStrengthMeter from '../../../components/passwordStrengthMeter/PasswordStrengthMeter';
import type { AuthenticationNavigationState } from '../models';

const SignUp = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const location = useLocation();
    const navigationState = location.state as AuthenticationNavigationState | null;
    const returnTo = navigationState?.returnTo;
    const navigate = useNavigate();
    const [visible, setVisibility] = useState<boolean>(false);
    const [isPending, setIsPending] = useState<boolean>(false);
    const redirectTimerRef = useRef<number | undefined>(undefined);
    const api = useJobTrackerAPI();
    const { showErrorToast, showSuccessToast } = useToast();

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                await api.authentication.verify();
                navigate(returnTo ?? routes.viewApplications, { replace: true });
            } catch {
                // no valid token, stay on sign up
            }
        };
        void verifyAuth();
    }, [api.authentication, navigate, returnTo]);

    useEffect(
        () => () => {
            if (redirectTimerRef.current !== undefined) {
                window.clearTimeout(redirectTimerRef.current);
            }
        },
        []
    );

    const handleSignUp = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const passwordValidationError = getPasswordValidationError(password);
        if (passwordValidationError) {
            showErrorToast(passwordValidationError);
            return;
        }

        setIsPending(true);

        try {
            await api.authentication.signUp({ email: normalizeEmail(email), password });

            showSuccessToast('Sign up successful — redirecting you to sign-in page');
            redirectTimerRef.current = window.setTimeout(() => {
                redirectTimerRef.current = undefined;
                if (returnTo) {
                    navigate(routes.signIn, { state: { returnTo } });
                } else {
                    navigate(routes.signIn);
                }
            }, 1500);
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to create your account. Please try again.'));
            setIsPending(false);
        }
    };

    return (
        <AuthLayout isAccountAccessPending={isPending}>
            <div className={`${styles.card} ${styles.signUpCard}`}>
                <BrandMark className={styles.logoIcon} size='lg' />
                <h2 className={`${styles.title} ${styles.titleWithDescription}`}>Create your account</h2>
                <p className={styles.cardDescription}>Track your applications and interviews in one place.</p>
                <form onSubmit={handleSignUp}>
                    <label htmlFor='email'>Email</label>
                    <div className={styles.inputBox}>
                        <Icon name='email' className={styles.leftIcon} />
                        <input
                            id='email'
                            type='email'
                            autoComplete='email'
                            disabled={isPending}
                            maxLength={EMAIL_MAX_LENGTH}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <label htmlFor='password'>Password</label>
                    <div className={styles.passwordWrapper}>
                        <Icon name='lock' className={styles.leftIcon} />
                        <input
                            aria-describedby='password-requirements password-strength'
                            id='password'
                            type={visible ? 'text' : 'password'}
                            autoComplete='new-password'
                            disabled={isPending}
                            maxLength={PASSWORD_MAX_BYTES}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <PrimaryButton
                            type='button'
                            variant='icon'
                            className={styles.toggleVisibility}
                            aria-label={visible ? 'Hide password' : 'Show password'}
                            onClick={() => setVisibility((isVisible) => !isVisible)}
                        >
                            <Icon name={visible ? 'visibility' : 'visibilityOff'} />
                        </PrimaryButton>
                    </div>
                    <p className={styles.passwordRequirements} id='password-requirements'>
                        Use {PASSWORD_MIN_LENGTH}–{PASSWORD_MAX_LENGTH} characters. Spaces and Unicode are allowed.
                    </p>
                    <PasswordStrengthMeter email={email} password={password} />

                    <PrimaryButton isLoading={isPending} variant='form' type='submit'>
                        Sign up
                    </PrimaryButton>

                    <Link
                        aria-disabled={isPending || undefined}
                        className={styles.authLink}
                        onClick={(event) => {
                            if (isPending) {
                                event.preventDefault();
                            }
                        }}
                        state={returnTo ? { returnTo } : undefined}
                        tabIndex={isPending ? -1 : undefined}
                        to={routes.signIn}
                    >
                        Already have an account? Sign in
                    </Link>
                </form>

                <AuthRequestInfo />
            </div>
        </AuthLayout>
    );
};

export default SignUp;
