import type { AuthLayoutProps } from './models';
import AuthProductIntro from '../authProductIntro/AuthProductIntro';
import styles from './AuthLayout.module.css';

const AuthLayout = ({ children, isAccountAccessPending = false }: AuthLayoutProps) => {
    return (
        <main className={styles.authPage}>
            <AuthProductIntro isAccountAccessPending={isAccountAccessPending}>{children}</AuthProductIntro>
        </main>
    );
};

export default AuthLayout;
