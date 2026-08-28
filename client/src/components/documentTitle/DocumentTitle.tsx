import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const DocumentTitle = () => {
    useEffect(() => {
        document.title = 'Job Tracker';
    }, []);

    return <Outlet />;
};

export default DocumentTitle;
