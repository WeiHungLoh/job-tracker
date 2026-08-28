import { Link, type LinkProps } from 'react-router-dom';
import styles from './PrimaryButton.module.css';

type ButtonLinkProps = Omit<LinkProps, 'className'> & {
    className?: string;
    variant?: 'default' | 'secondary';
};

const ButtonLink = ({ className = '', variant = 'default', ...props }: ButtonLinkProps) => {
    const variantClass = variant === 'secondary' ? styles.secondary : styles.primary;
    const classes = [styles.button, variantClass, styles.link, className].filter(Boolean).join(' ');

    return <Link className={classes} {...props} />;
};

export default ButtonLink;
