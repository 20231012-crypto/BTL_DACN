/**
 * Admin Orders Controller: coordinates order filters, multi-select bulk status transitions, and CSV export.
 */
import { useEffect, useState } from 'react';
import { adminLabel } from '../../models/constants.js';
import { list } from '../../models/formatters.js';
import {
  buildAdminOrdersExportUrl,
  bulkUpdateOrderStatus,
  computeAdminOrdersMetrics,
  expireOverdueOrders,
  filterAdminOrders,
  filterAdminRequests,
  filterAdminReturns,
  getQuickNextAction,
  updateAdminOrderStatus,
} from '../../models/adminModel.js';

export function useAdminOrdersController({
  orders = [],
  requests = [],
  returnGoods = [],
  tab,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenOrder,
  onOpenPrescription,
  onReload,
  notify,
  hasPermission,
}) {
  const [payMethod, setPayMethod] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [rxFilter, setRxFilter] = useState('');
  const [reqTypeFilter, setReqTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const canReviewRx = hasPermission('prescriptions');
  const ordersList = list(orders);
  const requestsList = list(requests);
  const returnGoodsList = list(returnGoods);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => ordersList.some((o) => o.id === id)),
    );
  }, [ordersList.length]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [
    tab,
    payMethod,
    payStatus,
    rxFilter,
    reqTypeFilter,
    dateRange.from,
    dateRange.to,
    sortBy,
  ]);

  const metrics = computeAdminOrdersMetrics(
    ordersList,
    requestsList,
    returnGoodsList,
  );

  const hasOrderFilters = Boolean(
    query ||
      filter ||
      payMethod ||
      payStatus ||
      rxFilter ||
      dateRange.from ||
      dateRange.to ||
      sortBy !== 'newest',
  );

  const clearFilters = () => {
    setQuery('');
    setFilter('');
    setPayMethod('');
    setPayStatus('');
    setRxFilter('');
    setReqTypeFilter('');
    setDateRange({ from: '', to: '' });
    setSortBy('newest');
  };

  const baseOrders = tab === 'queue' ? metrics.queueOrders : ordersList;
  const filteredOrders = filterAdminOrders(baseOrders, {
    filter,
    payMethod,
    payStatus,
    rxFilter,
    dateRange,
    query,
    sortBy,
  });
  const filteredRequests = filterAdminRequests(requestsList, {
    filter,
    reqTypeFilter,
    query,
  });
  const filteredReturns = filterAdminReturns(returnGoodsList, {
    filter,
    query,
  });

  const perPage = 10;
  const activeRows =
    tab === 'returns'
      ? filteredReturns
      : tab === 'requests'
        ? filteredRequests
        : filteredOrders;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = activeRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const visibleIds = visibleRows.map((o) => o.id);
  const allVisibleSelected =
    tab !== 'requests' &&
    tab !== 'returns' &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const quickStatusChange = async (order, nextStatus) => {
    setBusyId(order.id);
    try {
      await updateAdminOrderStatus(order.id, nextStatus);
      notify(`Đơn ${order.code} đã chuyển sang "${adminLabel(nextStatus)}".`);
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const runBulkTransition = async (targetStatus) => {
    if (!selectedIds.length) return;
    let note;
    if (targetStatus === 'cancelled') {
      const reason = window.prompt(
        'Nhập lý do hủy hàng loạt (tối thiểu 5 ký tự):',
        'Hủy đơn hàng theo yêu cầu xử lý',
      );
      if (reason === null) return;
      if (reason.trim().length < 5) {
        notify('Lý do hủy hàng loạt cần ít nhất 5 ký tự.', 'error');
        return;
      }
      note = reason.trim();
    }
    setBulkBusy(true);
    try {
      const res = await bulkUpdateOrderStatus(selectedIds, targetStatus, note);
      const verb = targetStatus === 'cancelled' ? 'hủy' : 'cập nhật';
      notify(
        res.failed?.length
          ? `Đã ${verb} ${res.updated.length} đơn; bỏ qua ${res.failed.length} đơn (${res.failed[0].code}: ${res.failed[0].error}).`
          : targetStatus === 'cancelled'
            ? `Đã hủy ${res.updated.length} đơn hàng.`
            : `Đã chuyển ${res.updated.length} đơn sang "${adminLabel(targetStatus)}".`,
        res.updated.length ? 'success' : 'error',
      );
      setSelectedIds([]);
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExpireOverdue = async () => {
    setBulkBusy(true);
    try {
      const res = await expireOverdueOrders();
      notify(
        res.expiredCount > 0
          ? `Đã tự động hủy ${res.expiredCount} đơn quá hạn thanh toán và hoàn tồn giữ chỗ.`
          : 'Hiện chưa có đơn thanh toán quá hạn đủ điều kiện hủy.',
      );
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleQuickButton = async (order, action) => {
    if (action.kind === 'status') {
      await quickStatusChange(order, action.status);
    } else if (action.kind === 'collect_cod') {
      await onOpenOrder(order, { nextStatus: 'delivered' });
    } else if (action.kind === 'rx') {
      await onOpenPrescription(order.prescriptionId);
    } else {
      await onOpenOrder(order);
    }
  };

  return {
    canReviewRx,
    ordersList,
    requestsList,
    returnGoodsList,
    ...metrics,
    payMethod,
    setPayMethod,
    payStatus,
    setPayStatus,
    rxFilter,
    setRxFilter,
    reqTypeFilter,
    setReqTypeFilter,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    hasOrderFilters,
    clearFilters,
    selectedIds,
    setSelectedIds,
    busyId,
    bulkBusy,
    activeRows,
    visibleRows,
    currentPage,
    perPage,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
    runBulkTransition,
    handleExpireOverdue,
    handleQuickButton,
    getQuickNextAction: (o) => getQuickNextAction(o, canReviewRx),
    exportUrl: buildAdminOrdersExportUrl({
      filter,
      payMethod,
      payStatus,
      rxFilter,
      dateRange,
      query,
    }),
  };
}
