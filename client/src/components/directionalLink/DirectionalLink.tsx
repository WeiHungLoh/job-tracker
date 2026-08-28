import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import Icon from '../icon/Icon';
import styles from './DirectionalLink.module.css';

type DirectionalLinkProps = Omit<LinkProps, 'children' | 'className'> & {
    children: ReactNode;
    className?: string;
    direction: 'back' | 'forward';
};

const DirectionalLink = ({ children, className = '', direction, ...props }: DirectionalLinkProps) => {
    const classes = [styles.link, className].filter(Boolean).join(' ');

    return (
        <Link className={classes} {...props}>
            {direction === 'back' && <Icon name='arrowBack' size={18} />}
            <span>{children}</span>
            {direction === 'forward' && <Icon name='arrowForward' size={18} />}
        </Link>
    );
};

export default DirectionalLink;
