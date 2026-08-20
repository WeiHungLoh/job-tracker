import Icon from '../icon/Icon';
import styles from './BrandMark.module.css';

type BrandMarkProps = {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
};

const BrandMark = ({ className = '', size = 'md' }: BrandMarkProps) => (
    <span aria-hidden='true' className={[styles.brandMark, styles[size], className].filter(Boolean).join(' ')}>
        <Icon name='briefcase' />
    </span>
);

export default BrandMark;
