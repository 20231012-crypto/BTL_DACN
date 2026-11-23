/**
 * Shared React Context providing global application state and controller actions to Views.
 */
import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);
