import { useLayoutEffect } from 'react';

const useScrollToTopOnMount = () => {
    useLayoutEffect(() => {
        window.scrollTo({ behavior: 'auto', left: 0, top: 0 });
    }, []);
};

export default useScrollToTopOnMount;
