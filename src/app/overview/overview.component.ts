import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction, DateColumn, Entity, SqlDatabase, StringColumn, ServerContext } from '@remult/core';
import { Roles } from '../auth/roles';
import { Sites,  validSchemaName } from '../sites/sites';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { SqlBuilder } from '../model-shared/types';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { DialogService, extractError } from '../select-popup/dialog';
import { Helpers } from '../helpers/helpers';
import { SiteOverviewComponent } from '../site-overview/site-overview.component';
import { SitesEntity, SchemaIdColumn } from '../sites/sites.entity';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService) { }
  overview: overviewResult;
  sortBy: string;
  async ngOnInit() {
    this.overview = await OverviewComponent.getOverview();

  }
  searchString = '';
  showSite(s: siteItem) {
    return !this.searchString || s.name.includes(this.searchString);
  }
  showSiteInfo(s: siteItem) {
    this.context.openDialog(SiteOverviewComponent, x => x.args = { site: s, statistics: this.overview.statistics });
  }
  doSort(s: dateRange) {
    this.sortBy = s.caption;
    this.overview.sites.sort((a, b) => b.stats[s.caption] - a.stats[s.caption]);
  }
  @ServerFunction({ allowed: Roles.overview })
  static async getOverview(context?: Context) {
    let today = new Date();
    let onTheWay = "בדרך";
    let inEvent = "באירוע";
    let result: overviewResult = {
      statistics: [
        {
          caption: 'היום',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        },
        {
          caption: 'אתמול',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate())
        },
        {
          caption: 'השבוע',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay()),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7)
        },
        {
          caption: 'השבוע שעבר',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7),
          to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
        },
        {
          caption: 'החודש',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        },
        {
          caption: 'חודש שעבר',
          value: 0,
          from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          to: new Date(today.getFullYear(), today.getMonth(), 1)
        },
        {
          caption: 'השנה',
          value: 0,
          from: new Date(today.getFullYear(), 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        }
        ,
        {
          caption: 'שנה שעברה',
          value: 0,
          from: new Date(today.getFullYear() - 1, 0, 1),
          to: new Date(today.getFullYear(), 0, 1)
        },
        {
          caption: 'אי פעם',
          value: 0,
          from: new Date(2017, 0, 1),
          to: new Date(today.getFullYear() + 1, 0, 1)
        },
        {
          caption: inEvent,
          value: 0,
          from: undefined,
          to: undefined
        },
        {
          caption: onTheWay,
          value: 0,
          from: undefined,
          to: undefined
        }
      ],
      sites: []
    };

    var builder = new SqlBuilder();
    let f = context.for(ActiveFamilyDeliveries).create();
    let fd = context.for(FamilyDeliveries).create();



    for (const org of Sites.schemas) {
      let dp = Sites.getDataProviderForOrg(org);

      var as = context.for(ApplicationSettings, dp).create();

      let cols: any[] = [as.organisationName, as.logoUrl];

      for (const dateRange of result.statistics) {
        let key = 'a' + cols.length;
        if (dateRange.caption == inEvent) {
          cols.push(builder.countInnerSelect({ from: f }, key));


        } else if (dateRange.caption == onTheWay) {
          cols.push(builder.countInnerSelect({ from: f, where: () => [f.onTheWayFilter()] }, key));
        }
        else
          cols.push(builder.build('(select count(*) from ', fd, ' where ', builder.and(fd.deliveryStatusDate.isGreaterOrEqualTo(dateRange.from).and(fd.deliveryStatusDate.isLessThan(dateRange.to).and(fd.deliverStatus.isAResultStatus()))), ') ', key));

      }

      let z = builder.query({
        select: () => cols,
        from: as,
      });
      let sql = dp as SqlDatabase;
      let zz = await sql.execute(z);
      let row = zz.rows[0];

      let site: siteItem = {
        name: row[zz.getColumnKeyInResultForIndexInSelect(0)],
        site: org,
        logo: row[zz.getColumnKeyInResultForIndexInSelect(1)],
        stats: {}
      };


      result.sites.push(site);
      let i = 2;
      for (const dateRange of result.statistics) {
        let r = row[zz.getColumnKeyInResultForIndexInSelect(i++)];

        dateRange.value += +r;
        site.stats[dateRange.caption] = r;
      }


    }
    return result;

  }
  async createNewSchema() {
    let id = new SchemaIdColumn();
    let name = new StringColumn('שם הארגון');
    this.context.openDialog(InputAreaComponent, x => x.args = {
      title: 'הוספת סביבה חדשה',
      settings: {
        columnSettings: () => [id, name]
      },
      validate: async () => {
        let x = validSchemaName(id.value);
        if (x != id.value) {
          if (await this.dialog.YesNoPromise('המזהה כלל תוים לא חוקיים שהוסרו, האם להמשיך עם המזהה "' + x + '"')) {
            id.value = x;
          } else
            throw "שם לא חוקי";
        }
        id.value = validSchemaName(id.value);
        let r = await OverviewComponent.validateNewSchema(id.value);
        if (r) {
          throw r;
        }
      },
      cancel: () => { },
      ok: async () => {
        try {
          let r = await OverviewComponent.createSchema(id.value, name.value);
          if (!r.ok)
            throw r.errorText;
            window.open(location.href = '/' + id.value,'_blank');
            this.ngOnInit();
        }
        catch (err) {
          this.dialog.Error(err);
        }

      }
    });
  }
  @ServerFunction({ allowed: Roles.overview })
  static async createSchema(id: string, name: string, context?: Context): Promise<{
    ok: boolean,
    errorText: string
  }> {
    let r = await OverviewComponent.validateNewSchema(id, context);
    if (r) {
      return {
        ok: false,
        errorText: r
      }
    }
    try {
      if (!name || name.length == 0)
        name = id;
      let oh = await context.for(Helpers).findId(context.user.id);
      let db = await OverviewComponent.createDbSchema(id);
      let otherContext = new ServerContext(db);
      otherContext._setUser(context.user);
      let h = await otherContext.for(Helpers).create();
      h.name.value = oh.name.value;
      h.realStoredPassword.value = oh.realStoredPassword.value;
      h.phone.value = oh.phone.value;
      h.admin.value = oh.admin.value;
      await h.save();
      let settings = await ApplicationSettings.getAsync(otherContext);

      settings.organisationName.value = name;
      await settings.save();

      let s = context.for(SitesEntity).create();
      s.id.value = id;
      await s.save();




      await OverviewComponent.createSchemaApi(id);
      Sites.addSchema(id);
      return { ok: true, errorText: '' }
    }
    catch (err) {
      return { ok: false, errorText: extractError(err) }
    }
  }
  static createDbSchema = async (id: string): Promise<SqlDatabase> => { return undefined };
  static createSchemaApi = async (id: string) => { };

  @ServerFunction({ allowed: Roles.overview })
  static async validateNewSchema(id: string, context?: Context) {
    let x = await context.for(SitesEntity).lookupAsync(x => x.id.isEqualTo(id));
    if (!x.isNew()) {
      return "מזהה כבר קיים";
    }
    let invalidSchemaName = ['admin', 'guest', 'public', 'select'];
    if (invalidSchemaName.includes(id))
      return id + ' הוא מזהה שמור ואסור לשימוש';
    return '';
  }

}

export interface siteItem {
  site: string;
  name: string;
  logo: string;
  stats: {
    [index: string]: number;
  }
}
interface overviewResult {
  statistics: dateRange[];
  sites: siteItem[];
}

export interface dateRange {
  caption: string;
  value: number;
  from: Date;
  to: Date;
}
