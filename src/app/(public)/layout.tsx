/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import QueryProvider from 'components/QueryProvider/QueryProvider';
import Header from 'components/Header/Header';
import Copyright from 'components/Copyright/Copyright';

/* PublicLayout component prop types ------------------- */
interface PublicLayoutProps {
  children: React.ReactNode;
}

/* PublicLayout component ------------------------------ */
const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <QueryProvider>
      <Header />
      <main className="flex-1 min-h-full flex flex-col items-center lg:p-24 lg:pt-8">
        {children}
      </main>
      <footer className="flex flex-col justify-center h-14">
        <Copyright />
      </footer>
    </QueryProvider>
  );
};

/* Export PublicLayout component ----------------------- */
export default PublicLayout;
