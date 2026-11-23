/**
 * Main Admin Controller: coordinates admin permissions, sidebar navigation, view data fetching, and modals.
 */
import { useEffect, useState } from 'react';
import {
  ADMIN_SUPPORT_POLL_MS,
  VIEW_PERMISSION,
} from '../../models/constants.js';
import { list, vnDate } from '../../models/formatters.js';
import {
  createAdminBackup,
  fetchAdminDashboardOverview,
  fetchAdminOrderDetails,
  fetchAdminPrescriptions,
  fetchAdminProductsAndPartners,
  fetchAdminSupportMessages,
  fetchAdminViewData,
  inviteAdminUser,
  prepareModalForm,
  restoreAdminBackup,
  saveAdminResource,
  toggleResourceActive,
  triggerBackupDownload,
} from '../../models/adminModel.js';

export function useAdminController({ user, onLogout, navItems }) {
  const hasPermission = (permission) =>
    user?.permissions?.includes(permission);
  const canReviewKnowledge = hasPermission('prescriptions');
  const isAdmin = user?.role === 'admin';

  const allowedNav = navItems.filter(
    ([key, , , adminOnly]) =>
      (!adminOnly || user?.role === 'admin') &&
      (hasPermission(VIEW_PERMISSION[key]) ||
        (key === 'chatbot' &&
          (hasPermission('knowledge') || canReviewKnowledge))),
  );

  const [view, setView] = useState(() => allowedNav[0]?.[0] || 'dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [orderRequests, setOrderRequests] = useState([]);
  const [returnGoods, setReturnGoods] = useState([]);
  const [tab, setTab] = useState('categories');
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: '', to: '' });
  const [dashDays, setDashDays] = useState(7);
  const [dashRefreshing, setDashRefreshing] = useState(false);
  const [navCounts, setNavCounts] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [view, tab, query, filter]);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshNavCounts = async () => {
    if (!hasPermission('reports')) return;
    try {
      const overview = await fetchAdminDashboardOverview(7);
      if (overview?.queues) setNavCounts(overview.queues);
    } catch {
      // Ignore if overview counts fail to refresh.
    }
  };

  const go = (next, opts = {}) => {
    const defaultTab =
      next === 'chatbot'
        ? hasPermission('support')
          ? 'support'
          : 'knowledge'
        : next === 'inventory'
          ? 'batches'
          : next === 'orders'
            ? 'orders'
            : 'categories';
    setView(next);
    setQuery(opts.query || '');
    setFilter(opts.filter || '');
    setTab(opts.tab || defaultTab);
    setData(null);
    setMenuOpen(false);
  };

  const load = async (
    silent = false,
    customRange = range,
    customDashDays = dashDays,
  ) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetchAdminViewData(
        view,
        tab,
        customRange,
        customDashDays,
      );
      setData(res.result);
      if (view === 'orders') {
        setOrderRequests(res.orderRequests || []);
        setReturnGoods(res.returnGoods || []);
      }
      if (view === 'dashboard' && res.result?.queues) {
        setNavCounts(res.result.queues);
      }
      if (view === 'products' || view === 'inventory') {
        const partners = await fetchAdminProductsAndPartners(
          hasPermission('catalog'),
        );
        setProducts(partners.products);
        if (hasPermission('catalog')) {
          setCategories(partners.categories);
          setManufacturers(partners.manufacturers);
        }
        setSuppliers(partners.suppliers);
      }
      if (view === 'settings') setForm(res.result || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const changeDashDays = async (nextDays) => {
    setDashDays(nextDays);
    setDashRefreshing(true);
    try {
      await load(true, range, nextDays);
    } finally {
      setDashRefreshing(false);
    }
  };

  useEffect(() => {
    const keepSilent =
      (view === 'orders' && Array.isArray(data)) ||
      (view === 'inventory' && Boolean(data?.batches));
    load(keepSilent);
  }, [view, tab]);

  useEffect(() => {
    if (view !== 'dashboard') refreshNavCounts();
  }, [view]);

  useEffect(() => {
    if (view !== 'chatbot' || tab !== 'support' || modal) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, ADMIN_SUPPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [view, tab, modal]);

  const change = (e) =>
    setForm((f) => ({
      ...f,
      [e.target.name]:
        e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const open = (type, item = {}, extraForm = {}) => {
    setForm(prepareModalForm(type, item, extraForm));
    setModal({ type, data: item });
  };

  const openReceiptModal = async (prefill = {}) => {
    let prodList = products;
    let supList = suppliers;
    if (!prodList.length || !supList.length) {
      try {
        const partners = await fetchAdminProductsAndPartners(false);
        prodList = partners.products;
        supList = partners.suppliers;
        setProducts(prodList);
        setSuppliers(supList);
      } catch {
        // Fallback to empty lists.
      }
    }
    const activeSupplier =
      supList.find((s) => s.active !== false)?.id || supList[0]?.id || '';
    const firstProductId = prefill.productId || prodList[0]?.id || '';
    open('receipt', prefill, {
      supplierId: prefill.supplierId || activeSupplier,
      items: [
        {
          productId: firstProductId,
          batchNumber: '',
          quantity: 10,
          cost: '',
          manufacturedAt: vnDate(0),
          expiresAt: vnDate(365),
        },
      ],
    });
  };

  const close = () => {
    if (saving) return;
    setModal(null);
    if (view === 'settings') setForm(data || {});
  };

  const submit = async (e, path, method = 'POST', payload = form) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await saveAdminResource(path, method, payload);
      setModal(null);
      notify('Đã lưu thay đổi thành công.');
      await Promise.all([
        load(true),
        view !== 'dashboard' ? refreshNavCounts() : Promise.resolve(),
      ]);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (resource, item, nextActive) => {
    setSaving(true);
    try {
      await toggleResourceActive(resource, item.id, nextActive);
      notify(
        nextActive
          ? 'Đã kích hoạt lại thành công.'
          : 'Đã cập nhật trạng thái.',
      );
      await Promise.all([
        load(true),
        view !== 'dashboard' ? refreshNavCounts() : Promise.resolve(),
      ]);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const orderDetail = async (order, extraForm = {}) => {
    try {
      const details = await fetchAdminOrderDetails(order.id);
      open('order', details, extraForm);
    } catch {
      open('order', order, extraForm);
    }
  };

  const openPrescriptionById = async (prescriptionId) => {
    try {
      const rxs = await fetchAdminPrescriptions();
      const rx = rxs.find((r) => r.id === prescriptionId);
      if (rx) open('prescription', rx);
      else notify('Không tìm thấy đơn thuốc.', 'error');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const supportDetail = async (item) => {
    try {
      const messages = await fetchAdminSupportMessages(item.id);
      open('support', { ...item, messages: list(messages) });
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const invitation = await inviteAdminUser(form);
      await load(true);
      setModal({ type: 'invited', data: invitation });
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitBackup = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const backup = await createAdminBackup(form.passphrase);
      triggerBackupDownload(backup);
      setModal(null);
      setForm(data || {});
      notify('Đã tạo bản sao lưu mã hóa.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitRestore = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await restoreAdminBackup({
        confirm: form.confirm,
        backup: form.backup,
        passphrase: form.passphrase,
      });
      setModal(null);
      notify('Đã phục hồi dữ liệu. Vui lòng đăng nhập lại.');
      onLogout();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const backup = JSON.parse(await file.text());
      setForm((f) => ({ ...f, backup }));
    } catch {
      notify('Không đọc được tệp JSON.', 'error');
      setForm((f) => ({ ...f, backup: null }));
    }
  };

  const applyReportsPreset = (fromVal, toVal) => {
    const next = { from: fromVal, to: toVal };
    setRange(next);
    load(false, next);
  };

  return {
    isAdmin,
    hasPermission,
    canReviewKnowledge,
    allowedNav,
    view,
    data,
    loading,
    error,
    toast,
    clearToast: () => setToast(null),
    notify,
    query,
    setQuery,
    filter,
    setFilter,
    modal,
    setModal,
    form,
    setForm,
    saving,
    setSaving,
    products,
    categories,
    suppliers,
    manufacturers,
    orderRequests,
    returnGoods,
    tab,
    setTab,
    menuOpen,
    setMenuOpen,
    page,
    setPage,
    range,
    setRange,
    dashDays,
    dashRefreshing,
    navCounts,
    go,
    load,
    changeDashDays,
    change,
    open,
    openReceiptModal,
    close,
    submit,
    toggleActive,
    orderDetail,
    openPrescriptionById,
    supportDetail,
    submitInvite,
    submitBackup,
    submitRestore,
    handleRestoreFileChange,
    applyReportsPreset,
  };
}
