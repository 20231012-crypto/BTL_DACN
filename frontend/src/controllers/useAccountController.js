/**
 * Account Controller: handles customer profile updates, saved wishlist, delivery addresses CRUD, and password change.
 */
import { useEffect, useState } from 'react';
import {
  changeUserPassword,
  deleteCustomerAddress,
  fetchAddresses,
  saveCustomerAddress,
  updateProfile,
} from '../models/accountModel.js';
import { useApp } from './AppContext.jsx';

export function useAccountController() {
  const { user, setUser, logout, notify, navigate, config, route, wishlist } =
    useApp();
  const googleStatus = new URLSearchParams(route.split('?')[1]).get('google');
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    birthDate: '',
    gender: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [address, setAddress] = useState({
    recipient: '',
    phone: '',
    line1: '',
    ward: '',
    district: '',
    city: '',
    isDefault: false,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);

  const loadAddresses = () =>
    fetchAddresses()
      .then(setAddresses)
      .catch((e) => notify(e.message, 'error'));

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        birthDate: user.birthDate || '',
        gender: user.gender || '',
      });
      loadAddresses();
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await updateProfile(profile);
      setUser(updated);
      notify('Đã cập nhật thông tin của bạn.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openNewAddress = () => {
    setAddress({
      recipient: user.name,
      phone: user.phone || '',
      line1: '',
      ward: '',
      district: '',
      city: '',
      isDefault: !addresses.length,
    });
    setEditing('new');
  };

  const openEditAddress = (item) => {
    setAddress(item);
    setEditing(item.id);
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveCustomerAddress(editing, address);
      setEditing(null);
      loadAddresses();
      notify('Đã lưu địa chỉ nhận hàng.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeAddress = async (id) => {
    try {
      await deleteCustomerAddress(id);
      loadAddresses();
      notify('Đã xóa địa chỉ.');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      notify('Mật khẩu nhập lại chưa khớp.', 'error');
      return;
    }
    setBusy(true);
    try {
      await changeUserPassword(
        passwords.currentPassword,
        passwords.newPassword,
      );
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setUser(null);
      navigate('/login');
      notify('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return {
    user,
    config,
    wishlist,
    googleStatus,
    tab,
    setTab,
    profile,
    setProfile,
    addresses,
    editing,
    setEditing,
    address,
    setAddress,
    passwords,
    setPasswords,
    busy,
    logout,
    saveProfile,
    openNewAddress,
    openEditAddress,
    saveAddress,
    removeAddress,
    changePassword,
  };
}
