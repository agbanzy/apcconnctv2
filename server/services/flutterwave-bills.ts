import crypto from "crypto";

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY as string;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

export interface BillCategory {
  id: number;
  bill_category_name: string;
  country: string;
}

export interface Biller {
  id: number;
  biller_code: string;
  name: string;
  country: string;
  category: string;
  is_airtime: boolean;
  fee: number;
  commission: number;
}

export interface BillItem {
  id: number;
  biller_code: string;
  item_code: string;
  name: string;
  label_name: string;
  amount: number;
  fee: number;
  commission: number;
}

export interface AirtimePaymentRequest {
  customer: string; // Phone number
  amount: number; // Amount in NGN
  reference: string;
}

export interface DataPaymentRequest {
  customer: string; // Phone number
  amount: number;
  reference: string;
  biller_code: string;
  item_code?: string;
}

export interface BillPaymentResponse {
  status: string;
  message: string;
  data: {
    phone_number: string;
    amount: number;
    network: string;
    flw_ref: string;
    tx_ref: string;
    reference?: string;
  };
}

class FlutterwaveBillsService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${FLW_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || `Flutterwave API error: ${response.statusText}`);
    }

    return data;
  }

  async getBillCategories(country: string = 'NG'): Promise<BillCategory[]> {
    const response = await this.makeRequest<{ data: BillCategory[] }>(
      `/bill-categories?country=${country}`
    );
    return response.data;
  }

  async getBillers(category: string, country: string = 'NG'): Promise<Biller[]> {
    const response = await this.makeRequest<{ data: Biller[] }>(
      `/billers?country=${country}&category=${encodeURIComponent(category)}`
    );
    return response.data;
  }

  async getBillItems(billerCode: string): Promise<BillItem[]> {
    const response = await this.makeRequest<{ data: BillItem[] }>(
      `/bill-items/${billerCode}`
    );
    return response.data;
  }

  async validateCustomer(billerCode: string, customer: string, itemCode?: string): Promise<{
    customer: string;
    name?: string;
    response_code: string;
  }> {
    const response = await this.makeRequest<{
      data: {
        customer: string;
        name?: string;
        response_code: string;
      };
    }>('/bill-items/validate', {
      method: 'POST',
      body: JSON.stringify({
        item_code: itemCode || billerCode,
        code: billerCode,
        customer,
      }),
    });
    return response.data;
  }

  async purchaseAirtime(request: AirtimePaymentRequest): Promise<BillPaymentResponse> {
    const payload = {
      country: 'NG',
      customer: request.customer,
      amount: request.amount,
      recurrence: 'ONCE',
      type: 'AIRTIME',
      reference: request.reference,
    };

    return await this.makeRequest<BillPaymentResponse>('/bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async purchaseData(request: DataPaymentRequest): Promise<BillPaymentResponse> {
    const payload = {
      country: 'NG',
      customer: request.customer,
      amount: request.amount,
      recurrence: 'ONCE',
      type: request.biller_code,
      reference: request.reference,
      ...(request.item_code && { item_code: request.item_code }),
    };

    return await this.makeRequest<BillPaymentResponse>('/bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getBillStatus(reference: string): Promise<{
    currency: string;
    customer_id: string;
    amount: string;
    product: string;
    product_name: string;
    commission: number;
    transaction_date: string;
    flw_ref: string;
    tx_ref: string;
    status?: string;
  }> {
    const response = await this.makeRequest<{
      data: {
        currency: string;
        customer_id: string;
        amount: string;
        product: string;
        product_name: string;
        commission: number;
        transaction_date: string;
        flw_ref: string;
        tx_ref: string;
        status?: string;
      };
    }>(`/bills/${reference}`);
    return response.data;
  }

  detectCarrierFromPhone(phoneNumber: string): string | null {
    // Remove country code and spaces
    const cleaned = phoneNumber.replace(/^\+234|^234|^0/, '').replace(/\s/g, '');
    
    // Nigerian network prefixes
    const mtnPrefixes = ['803', '806', '810', '813', '814', '816', '903', '906'];
    const airtelPrefixes = ['802', '808', '812', '901', '902', '904', '907', '912'];
    const gloPrefixes = ['805', '807', '811', '815', '905', '915'];
    const nineMobilePrefixes = ['809', '817', '818', '908', '909'];

    const prefix = cleaned.substring(0, 3);

    if (mtnPrefixes.includes(prefix)) return 'MTN';
    if (airtelPrefixes.includes(prefix)) return 'AIRTEL';
    if (gloPrefixes.includes(prefix)) return 'GLO';
    if (nineMobilePrefixes.includes(prefix)) return '9MOBILE';

    return null;
  }
}

export const flutterwaveBillsService = new FlutterwaveBillsService();
