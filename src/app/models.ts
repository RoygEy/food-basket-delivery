import * as radweb from 'radweb';
import { environment } from './../environments/environment';
import * as uuid from 'uuid';
import { CompoundIdColumn, DataProviderFactory, EntityOptions, Entity, BoolColumn, Column, NumberColumn, ClosedListColumn, ColumnSetting, StringColumn } from 'radweb';
import { foreachSync, foreachEntityItem } from './shared/utils';
import { evilStatics } from './auth/evil-statics';
import { GetGeoInformation, GeocodeInformation } from './shared/googleApiHelpers';
import { myAuthInfo } from './auth/my-auth-info';
import { DataColumnSettings } from 'radweb/utils/dataInterfaces1';
import { SelectServiceInterface } from './select-popup/select-service-interface';

import { SelectService } from './select-popup/select-service';

class IdEntity<idType extends Id> extends radweb.Entity<string>
{
  id: idType;
  constructor(id: idType, factory: () => IdEntity<idType>, source: DataProviderFactory, options?: EntityOptions | string) {
    super(factory, source, options);
    this.id = id;
    this.onSavingRow = () => {
      if (this.isNew() && !this.id.value && !this.disableNewId)
        this.id.setToNewId();
    }
  }
  private disableNewId = false;
  setEmptyIdForNewRow() {
    this.id.value = '';
    this.disableNewId = true;
  }
}



class Id extends radweb.StringColumn {
  setToNewId() {
    this.value = uuid();
  }
}
class DateTimeColumn extends radweb.DateTimeColumn {
  constructor(settingsOrCaption?: DataColumnSettings<string, DateTimeColumn> | string) {
    super(settingsOrCaption);
  }
  relativeDateName(d?: Date, now?: Date) {
    if (!d)
      d = this.dateValue;
    if (!d)
      return '';
    if (!now)
      now = new Date();
    let sameDay = (x: Date, y: Date) => {
      return x.getFullYear() == y.getFullYear() && x.getMonth() == y.getMonth() && x.getDate() == y.getDate()
    }
    let diffInMinues = Math.ceil((now.valueOf() - d.valueOf()) / 60000);
    if (diffInMinues <= 1)
      return 'לפני דקה';
    if (diffInMinues < 60) {

      return 'לפני ' + diffInMinues + ' דקות';
    }
    if (diffInMinues < 60 * 10 || sameDay(d, now)) {
      let hours = Math.floor(diffInMinues / 60);
      let min = diffInMinues % 60;
      if (min > 50) {
        hours += 1;
        min = 0;
      }
      let r;
      switch (hours) {
        case 1:
          r = 'שעה';
          break
        case 2:
          r = "שעתיים";
          break;
        default:
          r = hours + ' שעות';
      }

      if (min > 35)
        r += ' ושלושת רבעי';
      else if (min > 22) {
        r += ' וחצי';
      }
      else if (min > 7) {
        r += ' ורבע ';
      }
      return 'לפני ' + r;

    }
    let r = ''
    if (sameDay(d, new Date(now.valueOf() - 86400 * 1000))) {
      r = 'אתמול';
    }
    else if (sameDay(d, new Date(now.valueOf() - 86400 * 1000 * 2))) {
      r = 'שלשום';
    }
    else {
      r = 'ב' + d.toLocaleDateString();
    }
    let t = d.getMinutes().toString();
    if (t.length == 1)
      t = '0' + t;

    return r += ' ב' + d.getHours() + ':' + t;
  }

}
class changeDate extends DateTimeColumn {
  constructor(caption: string) {
    super({
      caption: caption,
      readonly: true
    });
  }

}



class ItemId extends Id {

}
export interface HasAsyncGetTheValue {
  getTheValue(): Promise<string>;
}
class HelperId extends Id implements HasAsyncGetTheValue {

  getColumn(dialog: SelectServiceInterface): ColumnSetting<Families> {
    return {
      column: this,
      getValue: f => this.getValue(),
      hideDataOnInput: true,
      click: f => dialog.selectHelper(s => f.courier.value = s.id.value),
      readonly: this.readonly,
      width: '200'

    }
  }
  getValue() {
    return this.lookup(new Helpers()).name.value;
  }
  async getTheValue() {
    let r = await this.lookupAsync(new Helpers());
    if (r && r.name && r.name.value && r.phone)
      return r.name.value + ' ' + r.phone.value;
    return '';
  }
}
class HelperIdReadonly extends HelperId {
  constructor(caption: string) {
    super({
      caption: caption,
      readonly: true
    });
  }
  get displayValue() {
    return this.lookup(new Helpers()).name.value;
  }
}
class BasketId extends Id implements HasAsyncGetTheValue {
  get displayValue() {
    return this.lookup(new BasketType()).name.value;
  }
  async getTheValue() {
    let r = await this.lookupAsync(new BasketType());
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
}
class FamilySourceId extends Id implements HasAsyncGetTheValue {
  get displayValue() {
    return this.lookup(new FamilySources()).name.value;
  }
  async getTheValue() {
    let r = await this.lookupAsync(new FamilySources());
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
}


class EventId extends Id { }
class FamilyId extends Id { }
class EventHelperId extends Id { }



export class CallStatusColumn extends radweb.ClosedListColumn<CallStatus> {
  constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
    super(CallStatus, settingsOrCaption);
  }


}

export class CallStatus {
  static NotYet: CallStatus = new CallStatus(0, 'עדיין לא');
  static Success: CallStatus = new CallStatus(10, 'בוצעה שיחה');
  static Failed: CallStatus = new CallStatus(20, 'לא הצלנו להשיג');
  constructor(public id: number,
    private caption: string) {

  }
  toString() {
    return this.caption;
  }
}

export class LanguageColumn extends ClosedListColumn<Language> {
  constructor() {
    super(Language, "שפה ראשית");
  }


}

export class Language {
  static Hebrew = new Language(0, 'עברית');
  static Russian = new Language(10, 'רוסית');
  static Amharit = new Language(20, 'אמהרית');
  constructor(public id: number,
    private caption: string) {

  }
  toString() {
    return this.caption;
  }

}

export class YesNoColumn extends ClosedListColumn<YesNo>{
  constructor(caption: string) {
    super(YesNo, caption);
  }
  getColumn() {
    return {
      column: this,
      dropDown: {
        items: this.getOptions()
      },
      width: '100'
    };
  }
}
export class YesNo {
  static Yes = new YesNo(1, 'כן');
  static No = new YesNo(0, 'לא');
  constructor(public id: number,
    private caption: string) {

  }
  toString() {
    return this.caption;
  }
}


export class DeliveryStatusColumn extends radweb.ClosedListColumn<DeliveryStatus> {
  constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
    super(DeliveryStatus, settingsOrCaption);
  }
  getColumn() {
    return {
      column: this,
      dropDown: {
        items: this.getOptions()
      },
      width: '150'
    };
  }

}

export class DeliveryStatus {
  static ReadyForDelivery: DeliveryStatus = new DeliveryStatus(0, 'מוכן למשלוח');
  static Success: DeliveryStatus = new DeliveryStatus(11, 'נמסר בהצלחה');
  static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, 'לא נמסר, בעייה בכתובת');
  static FailedNotHome: DeliveryStatus = new DeliveryStatus(23, 'לא נמסר, לא היו בבית');
  static FailedOther: DeliveryStatus = new DeliveryStatus(25, 'לא נמסר, אחר');
  static Frozen: DeliveryStatus = new DeliveryStatus(90, 'מוקפא');
  constructor(public id: number,
    private name: string) {

  }
  toString() {
    return this.name;
  }


}

export class Items extends IdEntity<ItemId>{

  eventId = new EventId();
  quantity = new radweb.NumberColumn("יח'");
  item = new radweb.StringColumn('מה צריך');
  totalSoFar = new radweb.NumberColumn({
    caption: 'נאסף',
    virtualData: async () => {
      let total = 0;
      await foreachEntityItem(new ItemsPerHelper(), i => i.itemId.isEqualTo(this.id), async (i) => {

        total += i.quantity.value;
      });
      return total;
    }
  });

  constructor() {
    super(new ItemId(), () => new Items(), evilStatics.dataSource, "items");
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(
      new ItemsPerHelper(),
      hi => hi.itemId.isEqualTo(this.id),
      item => item.delete());
    return super.delete();
  }

}
export class ItemsPerHelper extends radweb.Entity<string>{

  itemId = new ItemId();
  eventHelperId = new EventHelperId();
  quantity = new radweb.NumberColumn('כמות');


  private id = new CompoundIdColumn(this, this.itemId, this.eventHelperId)

  constructor() {
    super(() => new ItemsPerHelper(), evilStatics.dataSource, "ItemsPerHelper");
    this.initColumns(this.id);
  }
}
export class Helpers extends IdEntity<HelperId>{
  public static emptyPassword = 'password';
  name = new radweb.StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 3)
        this.name.error = 'השם קצר מידי';
    }
  });
  phone = new radweb.StringColumn({ caption: "טלפון", inputType: 'tel' });
  realStoredPassword = new radweb.StringColumn({ dbName: 'password' });
  password = new radweb.StringColumn({ caption: 'סיסמה', inputType: 'password', virtualData: () => Helpers.emptyPassword });

  createDate = new changeDate('מועד הוספה');
  smsDate = new changeDate('מועד משלוח SMS');
  reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
  isAdmin = new BoolColumn('מנהלת');
  shortUrlKey = new radweb.StringColumn();

  constructor(factory?: () => Helpers, name?: string, source?: DataProviderFactory) {

    super(new HelperId(), factory ? factory : () => new Helpers(), source ? source : evilStatics.openedDataApi, {
      name: name ? name : "Helpers",
      dbName: "Helpers"

    });
    this.initColumns();
    let x = this.onSavingRow;
    this.onSavingRow = () => {
      if (this.isNew())
        this.createDate.dateValue = new Date();
      x();
    };
  }
}


export class Families extends IdEntity<FamilyId>{


  name = new radweb.StringColumn({
    caption: "שם",
    onValidate: v => {
      if (!v.value || v.value.length < 3)
        this.name.error = 'השם קצר מידי';
    }
  });
  familyMembers = new radweb.NumberColumn('מספר נפשות');
  language = new LanguageColumn();
  basketType = new BasketId('סוג סל');
  familySource = new FamilySourceId('גורם מפנה');
  special = new YesNoColumn('שיוך מיוחד');
  internalComment = new radweb.StringColumn('הערה פנימית - לא תופיע למשנע');


  address = new radweb.StringColumn("כתובת");
  floor = new radweb.NumberColumn('קומה');
  appartment = new radweb.StringColumn('דירה');
  addressComment = new radweb.StringColumn('הערת כתובת');
  deliveryComments = new radweb.StringColumn('הערות למשנע');
  addressApiResult = new radweb.StringColumn();
  city = new radweb.StringColumn({ caption: "עיר כפי שגוגל הבין", readonly: true });

  phone1 = new radweb.StringColumn({ caption: "טלפון 1", inputType: 'tel', dbName: 'phone' });
  phone1Description = new radweb.StringColumn('תאור טלפון 1');
  phone2 = new radweb.StringColumn({ caption: "טלפון 2", inputType: 'tel' });
  phone2Description = new radweb.StringColumn('תאור טלפון 2');



  callStatus = new CallStatusColumn('סטטוס שיחה');
  callTime = new changeDate('מועד שיחה');
  callHelper = new HelperIdReadonly('מי ביצעה את השיחה');
  callComments = new radweb.StringColumn('הערות שיחה');


  courier = new HelperId("משנע");
  courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
  courierAssignUserName = new radweb.StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).name.value
  });
  courierAssignUserPhone = new radweb.StringColumn({
    caption: 'שם שיוך למשנע',
    virtualData: async () => (await this.lookupAsync(new Helpers(), this.courierAssignUser)).phone.value
  });
  courierAssingTime = new changeDate('מועד שיוך למשנע');


  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
  courierComments = new radweb.StringColumn('הערות מסירה');
  addressByGoogle() {
    let r: ColumnSetting<Families> = {
      caption: 'כתובת כפי שגוגל הבין',
      getValue: f => {
        let result = '';
        let g = f.getGeocodeInformation();
        if (!g.ok())
          return '!!! NOT OK!!!';
        return f.getGeocodeInformation().info.results[0].formatted_address;
      }
    }
    return r;
  }
  getDeliveryDescription() {
    switch (this.deliverStatus.listValue) {
      case DeliveryStatus.ReadyForDelivery:
        if (this.courier.value) {
          return this.courier.getValue() + ' יצא ' + this.courierAssingTime.relativeDateName();
        }
        break;
      case DeliveryStatus.Success:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedOther:
        let duration = '';
        if (this.courierAssingTime.value && this.deliveryStatusDate.value)
          duration = ' תוך ' + new Date(this.deliveryStatusDate.dateValue.valueOf() - this.courierAssingTime.dateValue.valueOf()).getMinutes().toString() + " דק'";
        return this.deliverStatus.displayValue + ' על ידי ' + this.courier.getValue() + ' ' + this.deliveryStatusDate.relativeDateName() + duration;

    }
    return this.deliverStatus.displayValue;
  }


  createDate = new changeDate('מועד הוספה');
  createUser = new HelperIdReadonly('משתמש מוסיף');





  openWaze() {
    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes', '_blank');
    window.open('waze://?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
  }
  openGoogleMaps() {
    window.open('https://www.google.com/maps/search/?api=1&query=' + this.address.value, '_blank');
  }
  


  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }
  constructor() {
    super(new FamilyId(), () => new Families(), evilStatics.dataSource, "Families");
    this.initColumns();
  }
  async doSave(authInfo: myAuthInfo) {
    await this.doSaveStuff(authInfo);
    await this.save();
  }
  async doSaveStuff(authInfo: myAuthInfo) {
    if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
      let geo = await GetGeoInformation(this.address.value);
      this.addressApiResult.value = geo.saveToString();
      this.city.value = '';
      if (geo.ok()) {
        this.city.value = geo.getCity();
      }
    }
    let logChanged = (col: Column<any>, dateCol: DateTimeColumn, user: HelperId) => {
      if (col.value != col.originalValue) {
        dateCol.dateValue = new Date();
        user.value = authInfo.helperId;
      }
    }
    if (this.isNew()) {
      this.createDate.dateValue = new Date();
      this.createUser.value = authInfo.helperId;
    }

    logChanged(this.courier, this.courierAssingTime, this.courierAssignUser);
    logChanged(this.callStatus, this.callTime, this.callHelper);
    logChanged(this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser);
  }
}
export class EventHelpers extends IdEntity<EventHelperId>{

  helperId = new HelperId();
  eventId = new EventId();
  constructor() {
    super(new EventHelperId(), () => new EventHelpers(), evilStatics.dataSource, 'EventHelpers');
    this.initColumns();
  }
  async delete() {
    foreachEntityItem(
      new ItemsPerHelper(),
      hi => hi.eventHelperId.isEqualTo(this.id),
      item => item.delete());
    return super.delete();
  }
  helper() {
    return this.lookup(new Helpers(), this.helperId);
  }
  event() {
    return this.lookupAsync(new Events(), this.eventId);
  }
}

function getItemSql(e: any) {
  let v = e;
  if (e instanceof Entity)
    v = e.__getDbName();
  if (e instanceof Column)
    v = e.__getDbName();
  if (e instanceof Array) {
    v = e.map(x => getItemSql(x)).join(', ');
  }
  return v;
}
function buildSql(...args: any[]): string {
  let result = '';
  args.forEach(e => {

    result += getItemSql(e);
  });
  return result;
}
let f = new Families();
let fromFamiliesWhereId = (h: Helpers) => buildSql(' from ', f
  , ' where ', f.courier, ' = ', h, '.', h.id, ' and ', f.deliverStatus, ' = ', DeliveryStatus.ReadyForDelivery.id)


export class HelpersAndStats extends Helpers {
  deliveriesInProgress = new NumberColumn({
    dbReadOnly: true,
    caption: 'משפחות מחכות',
    dbName: buildSql('(select count(*) ', fromFamiliesWhereId(this), ')')
  });
  firstDeliveryInProgressDate = new DateTimeColumn({
    dbReadOnly: true,
    dbName: buildSql('(select min(', f.courierAssingTime, ') ', fromFamiliesWhereId(this), ')')
  })
    ;
  constructor() {
    super(() => new HelpersAndStats(), "helpersAndStats", evilStatics.dataSource);
    this.initColumns();
  }
}
export class NewsUpdate extends Entity<string>{
  id = new StringColumn();
  name = new StringColumn();
  courier = new HelperId("משנע");
  courierAssingTime = new changeDate('מועד שיוך למשנע');
  courierAssignUser = new HelperIdReadonly('מי שייכה למשנע');
  deliverStatus = new DeliveryStatusColumn('סטטוס שינוע');
  deliveryStatusDate = new changeDate('מועד סטטוס שינוע');
  deliveryStatusUser = new HelperIdReadonly('מי עדכן את סטטוס המשלוח');
  updateTime = new changeDate('מועד העדכון');
  updateUser = new HelperIdReadonly('מי עדכן');
  updateType = new NumberColumn();
  constructor() {
    super(() => new NewsUpdate(), evilStatics.dataSource, {
      caption: 'חדשות',
      name: 'news',
      dbName: buildSql("(select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser], ", ", f.deliveryStatusDate, " updateTime, ", f.deliveryStatusUser, " updateUser, 1 updateType from ", f, " where ", f.deliveryStatusDate, " is not null ",
        "union select ", [f.id, f.name, f.courier, f.deliverStatus, f.deliveryStatusDate, f.courierAssingTime, f.courierAssignUser, f.deliveryStatusUser], ", ", f.courierAssingTime, " updateTime, ", f.courierAssignUser, " updateUser, 2 updateType from ", f, " where ", f.courierAssingTime, " is not null", ") x")
    });
    this.initColumns();
  }
}

export class Events extends IdEntity<EventId>{
  name = new radweb.StringColumn('שם אירוע');
  description = new radweb.StringColumn();
  constructor() {
    super(new EventId(), () => new Events(), evilStatics.dataSource, "events");
    this.initColumns();
  }
  async delete() {
    await foreachEntityItem(
      new Items(),
      hi => hi.eventId.isEqualTo(this.id),
      item => item.delete());

    await foreachEntityItem(
      new EventHelpers(),
      hi => hi.eventId.isEqualTo(this.id),
      item => item.delete());

    return super.delete();
  }
}

export class BasketType extends IdEntity<BasketId>{

  name = new radweb.StringColumn({ caption: "שם" });
  constructor() {

    super(new BasketId(), () => new BasketType(), evilStatics.dataSource, "BasketType");
    this.initColumns();
  }
}

export class FamilySources extends IdEntity<FamilySourceId>{

  name = new radweb.StringColumn({ caption: "שם" });
  contactPerson = new radweb.StringColumn({ caption: "איש קשר" });
  phone = new radweb.StringColumn('טלפון');
  constructor() {

    super(new FamilySourceId(), () => new FamilySources(), evilStatics.dataSource, "FamilySources");
    this.initColumns();
  }
}
