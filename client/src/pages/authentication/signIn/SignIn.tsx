import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AuthLayout from '../../../components/authLayout/AuthLayout';
import AuthRequestInfo from '../../../components/authRequestInfo/AuthRequestInfo';
import Icon from '../../../components/icon/Icon';
import BrandMark from '../../../components/brandMark/BrandMark';
import PrimaryButton from '../../../components/button/PrimaryButton';
import type { SubmitEvent } from 'react';
import { routes } from '../../../routes';
import styles from '../Authentication.module.css';
import { useJobTrackerAPI } from '../../../api/useJobTrackerAPI';
import { useToast } from '../../../components/toast/ToastProvider';
import { getErrorToastMessage } from '../../../helper/getErrorToastMessage';
import { normalizeEmail } from '../../../helper/formValidation';

const SignIn = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const location = useLocation();
    const navigate = useNavigate();
    const [visible, setVisibility] = useState<boolean>(false);
    const [isPending, setIsPending] = useState<boolean>(false);
    const api = useJobTrackerAPI();
    const { showErrorToast } = useToast();

    useEffect(() => {
        if (location.state?.fromLogout) {
            return;
        }

        const verifyAuth = async () => {
            try {
                await api.authentication.verify();
                navigate(routes.viewApplications, { replace: true });
            } catch {
                // no valid token, stay on sign in
            }
        };
        void verifyAuth();
    }, [api.authentication, navigate]);

    const handleSignIn = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsPending(true);

        try {
            await api.authentication.signIn({ email: normalizeEmail(email), password });
            navigate(routes.addApplication);
        } catch (error) {
            showErrorToast(getErrorToastMessage(error, 'Unable to sign in. Please try again.'));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <AuthLayout isAccountAccessPending={isPending}>
            <div className={styles.card}>
                <BrandMark className={styles.logoIcon} size='lg' />
                <h2 className={styles.title}>Sign in to Job Tracker</h2>
                <form onSubmit={handleSignIn}>
                    <label htmlFor='email'>Email</label>
                    <div className={styles.inputBox}>
                        <Icon name='email' className={styles.leftIcon} />
                        <input
                            id='email'
                            type='email'
                            autoComplete='email'
                            disabled={isPending}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <label htmlFor='password'>Password</label>
                    <div className={styles.passwordWrapper}>
                        <Icon name='lock' className={styles.leftIcon} />
                        <input
                            id='password'
                            type={visible ? 'text' : 'password'}
                            autoComplete='current-password'
                            disabled={isPending}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <PrimaryButton
                            type='button'
                            variant='icon'
                            className={styles.toggleVisibility}
                            aria-label={visible ? 'Hide password' : 'Show password'}
                            disabled={isPending}
                            onClick={() => setVisibility((isVisible) => !isVisible)}
                        >
                            <Icon name={visible ? 'visibility' : 'visibilityOff'} />
                        </PrimaryButton>
                    </div>

                    <PrimaryButton isLoading={isPending} variant='form' type='submit'>
                        Sign in
                    </PrimaryButton>

                    <Link
                        aria-disabled={isPending || undefined}
                        className={styles.authLink}
                        onClick={(event) => {
                            if (isPending) {
                                event.preventDefault();
                            }
                        }}
                        tabIndex={isPending ? -1 : undefined}
                        to={routes.signUp}
                    >
                        Don’t have an account? Create one
                    </Link>
                </form>
                <AuthRequestInfo />
            </div>
        </AuthLayout>
    );
};

export default SignIn;
